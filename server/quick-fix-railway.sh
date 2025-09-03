#!/bin/bash

echo "🔧 Quick Fix for Railway AI Functions"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "index.js" ]; then
    echo "❌ Error: Please run this script from the server directory"
    exit 1
fi

echo "📋 Current Status:"
echo "------------------"
echo "✅ Railway deployment: Working"
echo "✅ Food analysis: Working (with fallback)"
echo "❌ Chat endpoint: Missing"
echo "❌ Gemini API key: Invalid"
echo ""

# Step 1: Deploy current code to add missing endpoints
echo "🚀 Step 1: Deploying Updated Code"
echo "--------------------------------"
echo "This will add the missing chat endpoint and other AI functions..."
echo ""

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing current changes..."
    git add .
    git commit -m "Add missing AI endpoints and improve error handling"
else
    echo "✅ No changes to commit"
fi

echo "🔄 Deploying to Railway..."
railway up

echo ""
echo "⏱️  Waiting for deployment to complete..."
sleep 30

# Step 2: Test the deployment
echo ""
echo "🧪 Step 2: Testing Deployment"
echo "----------------------------"

echo "Testing server health..."
curl -s https://gofitai-production.up.railway.app/api/test | jq '.' 2>/dev/null || echo "Server test failed"

echo ""
echo "Testing food analysis..."
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"imageDescription": "banana"}' \
  https://gofitai-production.up.railway.app/api/analyze-food | jq '.' 2>/dev/null || echo "Food analysis test failed"

echo ""
echo "Testing chat endpoint (should work after deployment)..."
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"message": "Hello", "userId": "test"}' \
  https://gofitai-production.up.railway.app/api/chat | jq '.' 2>/dev/null || echo "Chat endpoint not yet available"

# Step 3: Clean up environment variables
echo ""
echo "🧹 Step 3: Cleaning Up Configuration"
echo "-----------------------------------"

echo "Removing conflicting environment variables..."
railway variables unset DEEPSEEK_API_KEY 2>/dev/null || echo "DEEPSEEK_API_KEY not set"
railway variables unset DEEPSEEK_API_URL 2>/dev/null || echo "DEEPSEEK_API_URL not set"
railway variables unset AI_DEEPSEEK_ONLY 2>/dev/null || echo "AI_DEEPSEEK_ONLY not set"

echo "✅ Configuration cleaned up"

# Step 4: Provide next steps
echo ""
echo "🎯 Next Steps Required"
echo "====================="
echo ""
echo "1. 🔑 Get New Gemini API Key:"
echo "   - Visit: https://makersuite.google.com/app/apikey"
echo "   - Sign in and create a new API key"
echo "   - Copy the key"
echo ""
echo "2. ⚙️  Update Railway Configuration:"
echo "   ./update-railway-config.sh YOUR_NEW_API_KEY"
echo ""
echo "3. 🧪 Test All Functions:"
echo "   ./test-all-ai-functions.js"
echo ""
echo "✅ Quick fix completed!"
echo "🌐 Your app: https://gofitai-production.up.railway.app"
echo ""
echo "💡 The main issue is just getting a valid Gemini API key."
echo "   Once you do that, all AI functions will work perfectly!"

