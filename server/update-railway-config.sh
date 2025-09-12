#!/bin/bash

echo "🚂 Updating Railway Configuration..."
echo ""

# Check if new API key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your new Gemini API key"
    echo "Usage: ./update-railway-config.sh YOUR_NEW_API_KEY"
    exit 1
fi

NEW_API_KEY="$1"

echo "🔧 Setting Railway environment variables..."

# Set AI provider to gemini
railway variables --set "AI_PROVIDER=gemini"
railway variables --set "FOOD_ANALYZE_PROVIDER=gemini"

# Set the new Gemini API key
railway variables --set "GEMINI_API_KEY=$NEW_API_KEY"

# Set production configuration
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=4000"
railway variables --set "AI_REQUEST_TIMEOUT=180000"
railway variables --set "LOG_LEVEL=info"

# Remove any conflicting variables
railway variables unset DEEPSEEK_API_KEY 2>/dev/null || echo "DEEPSEEK_API_KEY not set"
railway variables unset DEEPSEEK_API_URL 2>/dev/null || echo "DEEPSEEK_API_URL not set"
railway variables unset AI_DEEPSEEK_ONLY 2>/dev/null || echo "AI_DEEPSEEK_ONLY not set"

echo ""
echo "✅ Railway configuration updated!"
echo "🔄 Deploying to Railway..."
railway up

echo ""
echo "⏱️  Wait 2-3 minutes for deployment to complete"
echo "🌐 Your app will be available at: https://gofitai-production.up.railway.app"
echo ""
echo "🧪 Test your deployment with:"
echo "curl -X POST -H \"Content-Type: application/json\" -d '{\"imageDescription\": \"apple\"}' https://gofitai-production.up.railway.app/api/analyze-food"
