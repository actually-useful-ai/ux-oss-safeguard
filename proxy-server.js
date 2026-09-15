#!/usr/bin/env node

/**
 * Safeguard Proxy
 * Serves HTML frontends and proxies /api/* requests.
 * Translates Ollama-format requests to HuggingFace Inference API (OpenAI-compatible).
 * Deployed behind Caddy at /io/safeguard/ (path-stripped).
 */

const http = require('http');
const https = require('https');
const { readFile } = require('fs').promises;
const path = require('path');
const { homedir } = require('os');

const PORT = parseInt(process.env.PORT || '3456', 10);
const HF_BASE = 'https://router.huggingface.co/v1';
const HF_MODEL = 'openai/gpt-oss-safeguard-20b';

// Load HF token from ~/.cache/huggingface/token
let HF_TOKEN = process.env.HF_TOKEN || '';
try {
    HF_TOKEN = HF_TOKEN || require('fs').readFileSync(
        path.join(homedir(), '.cache/huggingface/token'), 'utf8'
    ).trim();
} catch { }

if (!HF_TOKEN) {
    console.warn('WARNING: No HuggingFace token found. Set HF_TOKEN env var or login with `huggingface-cli login`');
}

// ---------------------------------------------------------------------------
// Abuse controls for /api/chat (unauthenticated relay to a token-funded HF
// endpoint). All in-memory, dependency-free.
// ---------------------------------------------------------------------------

// Per-IP sliding-window rate limit.
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 20;                   // requests per window per IP
const rateBuckets = new Map();         // ip -> array of request timestamps (ms)
let lastRatePrune = 0;

// Resolve client IP: leftmost X-Forwarded-For (behind Caddy), else socket addr.
function clientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
        const first = xff.split(',')[0].trim();
        if (first) return first;
    }
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Returns { ok: true } or { ok: false, retryAfter: <seconds> }.
function checkRateLimit(req) {
    const now = Date.now();

    // Periodically prune stale IP buckets so the Map can't grow unbounded.
    if (now - lastRatePrune > RATE_WINDOW_MS) {
        for (const [ip, hits] of rateBuckets) {
            const fresh = hits.filter(t => now - t < RATE_WINDOW_MS);
            if (fresh.length) rateBuckets.set(ip, fresh);
            else rateBuckets.delete(ip);
        }
        lastRatePrune = now;
    }

    const ip = clientIp(req);
    const hits = (rateBuckets.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);

    if (hits.length >= RATE_MAX) {
        const retryAfter = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - hits[0])) / 1000));
        rateBuckets.set(ip, hits);
        return { ok: false, retryAfter };
    }

    hits.push(now);
    rateBuckets.set(ip, hits);
    return { ok: true };
}

// Global concurrency cap on in-flight upstream HF requests. Spoof-proof
// backstop: a forged X-Forwarded-For dodges the per-IP limiter but still
// counts against this. Each accepted /api/chat call must call releaseSlot()
// exactly once (guarded by a per-request flag to prevent double-decrement).
const MAX_INFLIGHT = 6;
const INFLIGHT_RETRY_AFTER = 5; // seconds
let inFlight = 0;

// Upstream timeout for HF requests (ms).
const HF_TIMEOUT_MS = 120 * 1000;

const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://dr.eamer.dev').split(',');
    if (allowedOrigins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
    else res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const { pathname } = new URL(req.url, 'http://localhost');

    // Health endpoint
    if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'safeguard', backend: 'huggingface' }));
        return;
    }

    // Serve static files
    const routes = {
        '/': 'safeguard.html',
        '/index.html': 'safeguard.html',
        '/chat': 'ollama-chat.html',
        '/chat/': 'ollama-chat.html',
        '/ollama-chat.html': 'ollama-chat.html',
        '/safeguard.html': 'safeguard.html',
    };

    if (routes[pathname]) {
        try {
            const html = await readFile(path.join(__dirname, routes[pathname]), 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
        }
        return;
    }

    // Serve screenshot files (for OG images)
    if (pathname.startsWith('/screenshots/') && pathname.endsWith('.png')) {
        try {
            const screenshotsDir = path.resolve(__dirname, 'screenshots');
            const imgPath = path.resolve(__dirname, pathname.slice(1));
            if (!imgPath.startsWith(screenshotsDir + path.sep)) {
                res.writeHead(403); res.end('Forbidden'); return;
            }
            const img = await readFile(imgPath);
            res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
            res.end(img);
        } catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
        }
        return;
    }

    // Fake /api/tags endpoint — return available models for the frontend model picker
    if (pathname === '/api/tags') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            models: [
                { name: 'gpt-oss-safeguard', model: 'gpt-oss-safeguard', details: { parameter_size: '20B' } },
            ]
        }));
        return;
    }

    // Proxy /api/chat → HuggingFace Inference API
    if (pathname === '/api/chat') {
        // 1) Per-IP rate limit.
        const rl = checkRateLimit(req);
        if (!rl.ok) {
            res.writeHead(429, {
                'Content-Type': 'application/json',
                'Retry-After': String(rl.retryAfter),
            });
            res.end(JSON.stringify({ error: 'Rate limit exceeded. Please slow down and try again later.' }));
            return;
        }

        // 2) Global concurrency cap (spoof-proof backstop).
        if (inFlight >= MAX_INFLIGHT) {
            res.writeHead(503, {
                'Content-Type': 'application/json',
                'Retry-After': String(INFLIGHT_RETRY_AFTER),
            });
            res.end(JSON.stringify({ error: 'Service busy. Please try again in a moment.' }));
            return;
        }

        // Reserve a slot. releaseSlot() is idempotent so it can be wired to
        // multiple lifecycle events without double-decrementing.
        inFlight++;
        let slotReleased = false;
        const releaseSlot = () => {
            if (slotReleased) return;
            slotReleased = true;
            inFlight--;
        };
        res.on('close', releaseSlot);
        res.on('finish', releaseSlot);

        try {
            const body = await collectBody(req);
            const ollamaReq = JSON.parse(body);

            // Translate Ollama format → OpenAI format
            const hfPayload = JSON.stringify({
                model: HF_MODEL,
                messages: ollamaReq.messages || [],
                max_tokens: ollamaReq.options?.num_predict || 4096,
                temperature: ollamaReq.options?.temperature ?? 1.0,
                top_p: ollamaReq.options?.top_p ?? 1.0,
                stream: !!ollamaReq.stream,
            });

            if (ollamaReq.stream) {
                await streamHF(hfPayload, res, req);
            } else {
                await nonStreamHF(hfPayload, res);
            }
        } catch (err) {
            console.error('Proxy error:', err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        } finally {
            releaseSlot();
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

// Collect request body (512 KB max)
const MAX_BODY = 512 * 1024;
function collectBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on('data', c => {
            total += c.length;
            if (total > MAX_BODY) { req.destroy(); reject(new Error('Request body too large')); return; }
            chunks.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString()));
        req.on('error', reject);
    });
}

// Non-streaming: call HF, translate response back to Ollama format
async function nonStreamHF(payload, res) {
    const hfRes = await fetchHF('/chat/completions', payload);
    const data = JSON.parse(hfRes);

    if (data.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: data.error }));
        return;
    }

    const msg = data.choices?.[0]?.message || {};
    // Ollama format response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        message: {
            role: 'assistant',
            content: msg.content || '',
            thinking: msg.reasoning || '',
        },
        done: true,
    }));
}

// Streaming: call HF with SSE, translate each chunk to Ollama newline-delimited JSON
async function streamHF(payload, res, req) {
    return new Promise((resolve, reject) => {
        const url = new URL(HF_BASE + '/chat/completions');

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
        };

        let settled = false;
        const finish = (err) => {
            if (settled) return;
            settled = true;
            if (err) reject(err); else resolve();
        };

        // If the client navigates away mid-stream, tear down the upstream
        // request so we stop pulling tokens (and burning quota) into a dead
        // socket. Without this the hfReq keeps streaming after the client is
        // gone. Bound to req and res 'close' to cover both directions.
        const onClientClose = () => {
            hfReq.destroy();
            finish();
        };
        res.on('close', onClientClose);
        if (req) req.on('close', onClientClose);

        const hfReq = https.request(options, (hfRes) => {
            if (hfRes.statusCode !== 200) {
                let body = '';
                hfRes.on('data', c => body += c);
                hfRes.on('end', () => {
                    console.error(`HF API ${hfRes.statusCode}:`, body.slice(0, 500));
                    res.writeHead(hfRes.statusCode >= 500 ? 502 : hfRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Classification service unavailable. Please try again.' }));
                    finish();
                });
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/x-ndjson',
                'Transfer-Encoding': 'chunked',
            });

            let buffer = '';
            hfRes.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') {
                        // Send Ollama done message
                        res.write(JSON.stringify({ message: { role: 'assistant', content: '' }, done: true }) + '\n');
                        continue;
                    }
                    try {
                        const delta = JSON.parse(payload);
                        const choice = delta.choices?.[0]?.delta || {};
                        // Translate SSE delta → Ollama streaming chunk
                        const ollamaChunk = {
                            message: {
                                role: 'assistant',
                                content: choice.content || '',
                            },
                            done: false,
                        };
                        // Include reasoning/thinking if present
                        if (choice.reasoning) {
                            ollamaChunk.message.thinking = choice.reasoning;
                        }
                        res.write(JSON.stringify(ollamaChunk) + '\n');
                    } catch { }
                }
            });

            hfRes.on('end', () => {
                res.end();
                finish();
            });

            hfRes.on('error', (err) => {
                res.end();
                finish(err);
            });
        });

        // Bound upstream timeout so a stalled HF connection can't pin an
        // in-flight slot forever.
        hfReq.setTimeout(HF_TIMEOUT_MS, () => {
            hfReq.destroy(new Error('Upstream HF request timed out'));
        });

        hfReq.on('error', (err) => {
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Classification service unavailable. Please try again.' }));
            } else {
                res.end();
            }
            finish(err);
        });
        hfReq.write(payload);
        hfReq.end();
    });
}

// Simple HTTPS fetch helper for non-streaming
function fetchHF(endpoint, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(HF_BASE + endpoint);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(body));
            res.on('error', reject);
        });

        req.setTimeout(HF_TIMEOUT_MS, () => {
            req.destroy(new Error('Upstream HF request timed out'));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

server.listen(PORT, () => {
    console.log(`Safeguard proxy running on port ${PORT} (HuggingFace backend)`);
});
