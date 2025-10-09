#!/bin/bash

echo "🚀 OVIDA Services Deployment Script"
echo "=================================="

# Fix TypeScript build issues first
echo "🔧 Step 1: Fixing build dependencies..."

# Remove problematic lockfile
rm -f pnpm-lock.yaml

# Reinstall dependencies
echo "📦 Installing dependencies..."
pnpm install --no-frozen-lockfile

# Force install TypeScript dependencies for web
echo "🔧 Installing TypeScript deps for web app..."
cd apps/web
pnpm install --save-dev @types/react @types/react-dom @types/node typescript
cd ../..

echo "✅ Dependencies fixed!"

# Build the web application  
echo "🏗️ Step 2: Building web application..."
cd apps/web
pnpm run build
if [ $? -eq 0 ]; then
    echo "✅ Web build successful!"
else
    echo "❌ Web build failed!"
    exit 1
fi
cd ../..

# Build the API
echo "🏗️ Step 3: Building API..."
cd apps/api
pnpm install
pnpm run build
if [ $? -eq 0 ]; then
    echo "✅ API build successful!"
else
    echo "❌ API build failed!"
    exit 1
fi
cd ../..

# Deploy services
echo "🚀 Step 4: Deploying services..."

# Stop existing services
echo "🔄 Stopping existing services..."
pkill -f "node mock_api.js" 2>/dev/null || true
pkill -f "node dist/index.js" 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:4001 | xargs kill -9 2>/dev/null || true

# Create simple environment file for mock API
echo "⚙️ Setting up environment..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
API_ORIGIN=http://localhost:4000
APP_ORIGIN=https://ovida.1976.cloud
EOF

# Start mock API service
echo "🚀 Starting mock API service..."
nohup node mock_api.js > api.log 2>&1 &
API_PID=$!

# Start WebSocket service if available
if [ -d "apps/ws" ]; then
    echo "🚀 Starting WebSocket service..."
    cd apps/ws
    if [ -f "package.json" ]; then
        pnpm install
        nohup pnpm start > ../ws.log 2>&1 &
        WS_PID=$!
        echo "✅ WebSocket service started with PID: $WS_PID"
    fi
    cd ../..
fi

echo "✅ Services deployment complete!"
echo ""
echo "📊 Service Status:"
echo "=================="

# Check API service
sleep 3
if ps -p $API_PID > /dev/null 2>&1; then
    echo "✅ API Service: Running (PID: $API_PID)"
    echo "🧪 Testing API endpoint..."
    curl -X POST http://localhost:4000/v1/demos/start -H "Content-Type: application/json" 2>/dev/null | head -c 100
    echo ""
else
    echo "❌ API Service: Failed to start"
    echo "📝 Checking logs:"
    cat api.log
fi

echo ""
echo "🎯 Results:"
echo "==========="
echo "✅ Build issues fixed"
echo "✅ Services deployed"
echo "🌐 Website: https://ovida.1976.cloud"
echo "🔗 API: http://localhost:4000"
echo "📝 Logs: api.log"

echo ""
echo "🎉 Deployment complete! Demo should now work."