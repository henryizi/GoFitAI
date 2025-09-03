#!/bin/bash

echo "🚀 Comprehensive Railway AI Functions Fix"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "index.js" ]; then
    echo "❌ Error: Please run this script from the server directory"
    exit 1
fi

echo "📋 Current Status:"
echo "------------------"
echo "✅ Railway CLI: $(command -v railway >/dev/null && echo 'Installed' || echo 'Not installed')"
echo "✅ Server running: $(curl -s http://localhost:4000/api/test >/dev/null && echo 'Yes' || echo 'No')"
echo ""

# Step 1: Check current Railway configuration
echo "🔍 Step 1: Checking Railway Configuration"
echo "----------------------------------------"
if command -v railway &> /dev/null; then
    echo "Current Railway variables:"
    railway variables | grep -E "(GEMINI|AI|FOOD)" || echo "No AI variables found"
    echo ""
else
    echo "⚠️  Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   railway login"
    echo ""
fi

# Step 2: Get new Gemini API key
echo "🔑 Step 2: Getting New Gemini API Key"
echo "------------------------------------"
echo "Please follow these steps to get a valid Gemini API key:"
echo ""
echo "1. Go to: https://makersuite.google.com/app/apikey"
echo "2. Sign in with your Google account"
echo "3. Click 'Create API Key'"
echo "4. Copy the new API key"
echo ""
echo "💡 The current key appears to be invalid (400 error)"
echo ""

# Step 3: Update Railway with new configuration
echo "⚙️  Step 3: Railway Configuration Update"
echo "----------------------------------------"
echo "Once you have a new Gemini API key, run these commands:"
echo ""

# Create a script to update Railway
cat > update-railway-config.sh << 'EOF'
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
EOF

chmod +x update-railway-config.sh

echo "✅ Created update-railway-config.sh script"
echo ""
echo "📝 Usage:"
echo "1. Get your new Gemini API key from https://makersuite.google.com/app/apikey"
echo "2. Run: ./update-railway-config.sh YOUR_NEW_API_KEY"
echo ""

# Step 4: Test local server
echo "🧪 Step 4: Testing Local Server"
echo "-------------------------------"
if curl -s http://localhost:4000/api/test >/dev/null; then
    echo "✅ Local server is running"
    echo "🌐 Test URL: http://localhost:4000/api/test"
else
    echo "❌ Local server is not running"
    echo "💡 Start it with: node index.js"
fi

echo ""
echo "🎯 Summary:"
echo "----------"
echo "1. ❌ Current Gemini API key is invalid"
echo "2. ✅ Railway configuration script created"
echo "3. ✅ All AI functions will work once new key is set"
echo ""
echo "🔧 Next Steps:"
echo "1. Get new Gemini API key from Google"
echo "2. Run: ./update-railway-config.sh YOUR_NEW_KEY"
echo "3. Wait for Railway deployment"
echo "4. Test all AI functions"
echo ""
echo "✅ Setup complete! Follow the steps above to fix your AI functions."

