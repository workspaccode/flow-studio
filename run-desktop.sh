#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Check if build exists, if not build it
if [ ! -f "dist/index.html" ]; then
  echo "Building web bundle..."
  npm run build
fi

echo "Starting Flow Studio Desktop..."
npx electron desktop/main.cjs
