#!/usr/bin/env node

/**
 * CORS Proxy for Ollama
 * Run this with: node proxy-server.js
 * Then open ollama-chat.html via: http://localhost:3000/ollama-chat.html
 */

const http = require('http');
const { readFile } = require('fs').promises;
const path = require('path');

const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434';

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const { pathname } = new URL(req.url, 'http://localhost');

    // Serve HTML files
    const htmlFiles = {
        '/': 'safeguard.html',
        '/ollama-chat.html': 'ollama-chat.html',
        '/safeguard.html': 'safeguard.html',
    };
    if (htmlFiles[pathname]) {
        try {
            const html = await readFile(path.join(__dirname, htmlFiles[pathname]), 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        }
        return;
    }

    // Proxy Ollama API requests
    if (pathname.startsWith('/api/')) {
        try {
            const ollamaReq = {
                hostname: 'localhost',
                port: 11434,
                path: pathname,
                method: req.method,
                headers: {
                    ...req.headers,
                    host: 'localhost:11434'
                }
            };

            // Make request to Ollama
            await new Promise((resolve, reject) => {
                const clientReq = http.request(ollamaReq, (ollamaRes) => {
                    // Forward status code and headers
                    res.writeHead(ollamaRes.statusCode, ollamaRes.headers);

                    // Copy response body
                    ollamaRes.on('data', (chunk) => res.write(chunk));
                    ollamaRes.on('end', () => res.end());
                    ollamaRes.on('error', reject);
                });

                clientReq.on('error', reject);

                // Copy request body
                const body = [];
                req.on('data', (chunk) => body.push(chunk));
                req.on('end', () => {
                    if (body.length > 0) {
                        clientReq.write(Buffer.concat(body));
                    }
                    clientReq.end();
                });
            });
        } catch (err) {
            console.error('Proxy error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`🚀 Ollama CORS Proxy running at http://localhost:${PORT}`);
    console.log(`📝 Open http://localhost:${PORT}/ollama-chat.html in your browser`);
    console.log(`\nTo stop, press Ctrl+C`);
});