#!/bin/bash

echo "🔧 Fixing build issues and deploying services..."

# Fix pnpm lockfile and dependencies
echo "📦 Regenerating lockfile..."
rm -f pnpm-lock.yaml
pnpm install --no-frozen-lockfile

# Specifically install @types/react for web app
echo "🔧 Installing TypeScript dependencies..."
cd apps/web
pnpm install --save-dev @types/react@18.2.79 @types/react-dom@18.2.25
cd ../..

echo "🏗️ Building web app..."
cd apps/web
pnpm run build
cd ../..

echo "✅ Build fix complete!"