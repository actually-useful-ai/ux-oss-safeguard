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

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
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
            const img = await readFile(path.join(__dirname, pathname));
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
                await streamHF(hfPayload, res);
            } else {
                await nonStreamHF(hfPayload, res);
            }
        } catch (err) {
            console.error('Proxy error:', err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

// Collect request body
function collectBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
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
async function streamHF(payload, res) {
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

        const hfReq = https.request(options, (hfRes) => {
            if (hfRes.statusCode !== 200) {
                let body = '';
                hfRes.on('data', c => body += c);
                hfRes.on('end', () => {
                    res.writeHead(hfRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `HF API ${hfRes.statusCode}: ${body.slice(0, 200)}` }));
                    resolve();
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
                resolve();
            });

            hfRes.on('error', (err) => {
                res.end();
                reject(err);
            });
        });

        hfReq.on('error', reject);
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

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

server.listen(PORT, () => {
    console.log(`Safeguard proxy running on port ${PORT} (HuggingFace backend)`);
});
