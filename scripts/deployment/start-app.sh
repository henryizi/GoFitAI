#!/bin/bash

# 🚀 GoFitAI - Complete Startup Script
# This script ensures both server and app start correctly

echo "🚀 Starting GoFitAI Complete System..."

# Get current IP address
echo "📡 Getting current IP address..."
IP_ADDRESS=$(ifconfig | grep -A 1 "en0" | grep inet | awk '{print $2}' | head -1)
echo "   Current IP: $IP_ADDRESS"

# Update .env file with current IP
echo "⚙️  Updating .env file with current IP..."
if [ -f .env ]; then
    sed -i '' "s|EXPO_PUBLIC_API_URL=http://.*:4000|EXPO_PUBLIC_API_URL=http://$IP_ADDRESS:4000|g" .env
    echo "   ✅ Updated API URL to: http://$IP_ADDRESS:4000"
else
    echo "   ⚠️  .env file not found - creating it..."
    cp env.example .env
    sed -i '' "s|EXPO_PUBLIC_API_URL=http://.*:4000|EXPO_PUBLIC_API_URL=http://$IP_ADDRESS:4000|g" .env
fi

# Start server in background
echo "🖥️  Starting server..."
cd server
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing server dependencies..."
    npm install
fi

# Kill any existing server on port 4000
echo "   🔄 Checking for existing server..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || echo "   No existing server found"

# Start server
echo "   🚀 Starting server on port 4000..."
npm start &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

# Go back to app directory
cd ..

# Wait for server to start
echo "⏳ Waiting for server to start..."
for i in {1..10}; do
    if curl -s http://$IP_ADDRESS:4000/api/health > /dev/null; then
        echo "   ✅ Server is running!"
        break
    fi
    echo "   Attempt $i/10..."
    sleep 2
done

# Test server connectivity
echo "🔍 Testing server connectivity..."
HEALTH_RESPONSE=$(curl -s http://$IP_ADDRESS:4000/api/health)
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "   ✅ Server health check passed: $HEALTH_RESPONSE"
else
    echo "   ❌ Server health check failed!"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

# Start the React Native app
echo "📱 Starting React Native app..."
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing app dependencies..."
    npm install
fi

# Clear Metro cache and start
echo "   🚀 Starting app with cleared cache..."
npx expo start --clear

echo "🎉 GoFitAI startup complete!"
echo "📝 Server running at: http://$IP_ADDRESS:4000"
echo "📱 App starting in Expo..."
