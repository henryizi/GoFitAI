#!/bin/bash

# Check if API key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Gemini API key"
    echo ""
    echo "Usage: ./update-railway-config.sh YOUR_API_KEY"
    echo ""
    echo "To get a Gemini API key:"
    echo "1. Visit: https://makersuite.google.com/app/apikey"
    echo "2. Sign in with your Google account"
    echo "3. Click 'Create API Key'"
    echo "4. Copy the key and run this script"
    echo ""
    echo "Example: ./update-railway-config.sh AIzaSyYourActualKeyHere"
    exit 1
fi

API_KEY="$1"

echo "🔧 Updating Railway Configuration"
echo "================================="
echo ""

# Test the API key first
echo "🧪 Testing API key..."
TEST_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $API_KEY" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent)

if echo "$TEST_RESPONSE" | grep -q "error"; then
    echo "❌ API key test failed!"
    echo "Response: $TEST_RESPONSE"
    echo ""
    echo "Please check your API key and try again."
    exit 1
else
    echo "✅ API key is valid!"
fi

echo ""
echo "⚙️  Updating Railway environment variables..."

# Update the Gemini API key
railway variables --set "GEMINI_API_KEY=$API_KEY"

# Ensure other variables are set correctly
railway variables --set "AI_PROVIDER=gemini"
railway variables --set "FOOD_ANALYZE_PROVIDER=gemini"
railway variables --set "AI_REQUEST_TIMEOUT=180000"
railway variables --set "AI_CHAT_TIMEOUT=180000"
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=4000"
railway variables --set "LOG_LEVEL=info"

echo "✅ Configuration updated!"

echo ""
echo "🔄 Redeploying to apply changes..."
railway up

echo ""
echo "⏱️  Waiting for deployment to complete..."
sleep 30

echo ""
echo "🧪 Testing all functions..."

# Test server health
echo "1. Testing server health..."
curl -s https://gofitai-production.up.railway.app/api/test | jq '.' 2>/dev/null || echo "Server test failed"

echo ""
echo "2. Testing food analysis..."
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"imageDescription": "apple"}' \
  https://gofitai-production.up.railway.app/api/analyze-food | jq '.' 2>/dev/null || echo "Food analysis test failed"

echo ""
echo "3. Testing chat endpoint..."
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"planId": "test", "message": "Hello", "currentPlan": {"id": "test"}}' \
  https://gofitai-production.up.railway.app/api/ai-chat | jq '.' 2>/dev/null || echo "Chat endpoint test failed"

echo ""
echo "4. Testing workout plan generation..."
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "preferences": {"fitnessLevel": "beginner", "goals": ["weight_loss"], "availableTime": 30, "equipment": ["none"]}}' \
  https://gofitai-production.up.railway.app/api/generate-workout-plan | jq '.' 2>/dev/null || echo "Workout plan test failed"

echo ""
echo "🎉 Configuration update completed!"
echo "🌐 Your app: https://gofitai-production.up.railway.app"
echo ""
echo "💡 All AI functions should now work with your valid API key!"
