#!/bin/bash

echo "🔧 Fixing Gemini API Configuration for Railway Deployment"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "index.js" ]; then
    echo "❌ Error: Please run this script from the server directory"
    exit 1
fi

echo ""
echo "📋 Current Environment Status:"
echo "-------------------------------"

# Check environment variables
if [ -n "$GEMINI_API_KEY" ]; then
    echo "✅ GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."
else
    echo "❌ GEMINI_API_KEY: Not set"
fi

if [ -n "$FOOD_ANALYZE_PROVIDER" ]; then
    echo "✅ FOOD_ANALYZE_PROVIDER: $FOOD_ANALYZE_PROVIDER"
else
    echo "❌ FOOD_ANALYZE_PROVIDER: Not set (will default to gemini)"
fi

if [ -n "$AI_PROVIDER" ]; then
    echo "✅ AI_PROVIDER: $AI_PROVIDER"
else
    echo "❌ AI_PROVIDER: Not set (will default to gemini)"
fi

echo ""
echo "🔍 Testing Gemini API Configuration:"
echo "------------------------------------"

# Test Gemini API directly
if [ -n "$GEMINI_API_KEY" ]; then
    echo "Testing Gemini API with current key..."
    
    # Test basic API call
    response=$(curl -s -w "%{http_code}" -X POST \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{
                "role": "user",
                "parts": [{"text": "Hello"}]
            }]
        }')
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Gemini API is working correctly"
    else
        echo "❌ Gemini API error (HTTP $http_code):"
        echo "$response_body" | jq . 2>/dev/null || echo "$response_body"
        echo ""
        echo "🔧 Attempting to fix API key issues..."
    fi
else
    echo "❌ No GEMINI_API_KEY found - cannot test API"
fi

echo ""
echo "🚀 Railway Deployment Configuration:"
echo "------------------------------------"

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found"
    
    # Set environment variables for Railway
    echo "Setting up Railway environment variables..."
    
    # Set AI provider to gemini
    railway variables --set "AI_PROVIDER=gemini" 2>/dev/null || echo "⚠️  Could not set AI_PROVIDER"
    railway variables --set "FOOD_ANALYZE_PROVIDER=gemini" 2>/dev/null || echo "⚠️  Could not set FOOD_ANALYZE_PROVIDER"
    
    echo ""
    echo "📋 Railway Environment Variables:"
    railway variables | grep -E "(GEMINI|AI|FOOD)" || echo "No AI-related variables found"
    
else
    echo "⚠️  Railway CLI not found - please install it or set variables manually"
    echo ""
    echo "Manual Railway Configuration:"
    echo "1. Go to your Railway project dashboard"
    echo "2. Navigate to Variables tab"
    echo "3. Add these variables:"
    echo "   - GEMINI_API_KEY: Your valid Gemini API key"
    echo "   - AI_PROVIDER: gemini"
    echo "   - FOOD_ANALYZE_PROVIDER: gemini"
fi

echo ""
echo "🧪 Testing Server Configuration:"
echo "-------------------------------"

# Test the server configuration
node -e "
const dotenv = require('dotenv');
dotenv.config();

console.log('Environment Check:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- FOOD_ANALYZE_PROVIDER:', process.env.FOOD_ANALYZE_PROVIDER || 'gemini (default)');
console.log('- AI_PROVIDER:', process.env.AI_PROVIDER || 'gemini (default)');

if (process.env.GEMINI_API_KEY) {
    const axios = require('axios');
    const testUrl = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${process.env.GEMINI_API_KEY}\`;
    
    axios.post(testUrl, {
        contents: [{
            role: 'user',
            parts: [{ text: 'Test' }]
        }]
    }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
    })
    .then(() => console.log('✅ Gemini API test successful'))
    .catch(err => {
        console.log('❌ Gemini API test failed:', err.response?.status, err.response?.data?.error?.message || err.message);
        console.log('💡 Please check your API key at: https://makersuite.google.com/app/apikey');
    });
} else {
    console.log('⚠️  Skipping API test - no key available');
}
"

echo ""
echo "🎯 Next Steps:"
echo "--------------"
echo "1. If Gemini API is not working, get a new key from:"
echo "   https://makersuite.google.com/app/apikey"
echo ""
echo "2. Set the new key in Railway:"
echo "   railway variables --set 'GEMINI_API_KEY=your_new_key'"
echo ""
echo "3. Deploy to Railway:"
echo "   railway up"
echo ""
echo "4. Test the deployment:"
echo "   curl https://your-railway-app.railway.app/api/test"
echo ""
echo "✅ Configuration fix complete!"
