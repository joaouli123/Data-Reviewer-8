#!/bin/bash
set -e

echo "Building frontend with Vite..."
npx vite build

echo "Bundling server with esbuild..."
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/index.js \
  --format=esm \
  --external:bcryptjs \
  --external:pg \
  --external:@neondatabase/serverless \
  --packages=external

echo "Build complete!"
