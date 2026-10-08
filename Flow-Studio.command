#!/usr/bin/env bash
cd "$(dirname "$0")"
if [ ! -f "dist/index.html" ]; then
  npm run build
fi
npx electron desktop/main.cjs
