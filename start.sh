#!/bin/bash
cd "$(dirname "$0")"
export HF_TOKEN="${HF_TOKEN:-$(grep HF_TOKEN .env 2>/dev/null | cut -d= -f2)}"
exec node proxy-server.js
