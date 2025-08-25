#!/bin/bash

# Script to run the app with Railway configuration
echo "🚂 Setting up environment for Railway production API..."

export EXPO_PUBLIC_API_URL="https://gofitai-production.up.railway.app"
export NODE_ENV="production"

echo "✅ Environment configured:"
echo "   API URL: $EXPO_PUBLIC_API_URL"
echo "   Node Environment: $NODE_ENV"

echo ""
echo "🚀 Starting Expo app with Railway configuration..."

# Start the Expo app
npx expo start --clear



