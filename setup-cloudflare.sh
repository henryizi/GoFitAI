#!/bin/bash

echo "🚀 Complete Railway Deployment with Cloudflare Workers AI"
echo "======================================================"
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    echo "curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Current Railway Environment Variables Status:"
echo "================================================="

# Show current variables (excluding sensitive ones)
railway variables | grep -E "(CF_|NODE_ENV|EXPO_PUBLIC_API_URL|AI_DEEPSEEK_ONLY|LOG_LEVEL)" || echo "No Cloudflare variables found"

echo ""
echo "🔧 Setting up missing environment variables..."
echo ""

# Set production environment variables
echo "Setting production environment variables..."
railway variables --set "NODE_ENV=production"
railway variables --set "EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app"
railway variables --set "AI_DEEPSEEK_ONLY=true"
railway variables --set "LOG_LEVEL=info"
railway variables --set "FOOD_ANALYZE_PROVIDER=deepseek"

echo ""
echo "🌐 Cloudflare Workers AI Configuration"
echo "======================================"
echo ""

# Check if Cloudflare variables are already set
CF_ACCOUNT_EXISTS=$(railway variables | grep "CF_ACCOUNT_ID" || echo "")
CF_TOKEN_EXISTS=$(railway variables | grep "CF_API_TOKEN" || echo "")

if [ -n "$CF_ACCOUNT_EXISTS" ] && [ -n "$CF_TOKEN_EXISTS" ]; then
    echo "✅ Cloudflare variables already configured!"
    echo ""
    echo "Current Cloudflare configuration:"
    railway variables | grep "CF_"
else
    echo "❌ Cloudflare variables not found. Let's set them up..."
    echo ""
    echo "Please provide your Cloudflare credentials:"
    echo "(Get these from https://dash.cloudflare.com)"
    echo ""

    # Get Cloudflare Account ID
    read -p "Enter your Cloudflare Account ID: " CF_ACCOUNT_ID
    if [ -z "$CF_ACCOUNT_ID" ]; then
        echo "❌ Cloudflare Account ID is required"
        exit 1
    fi

    # Get Cloudflare API Token
    read -p "Enter your Cloudflare API Token: " CF_API_TOKEN
    if [ -z "$CF_API_TOKEN" ]; then
        echo "❌ Cloudflare API Token is required"
        exit 1
    fi

    echo ""
    echo "Setting Cloudflare environment variables..."

    # Set Cloudflare variables
    railway variables --set "CF_ACCOUNT_ID=$CF_ACCOUNT_ID"
    railway variables --set "CF_API_TOKEN=$CF_API_TOKEN"
    railway variables --set "CF_VISION_MODEL=@cf/llava-1.5-7b-hf"

    if [ $? -eq 0 ]; then
        echo "✅ Cloudflare credentials configured successfully!"
    else
        echo "❌ Failed to set Cloudflare environment variables"
        exit 1
    fi
fi

echo ""
echo "📋 Complete Environment Variables Summary:"
echo "=========================================="

# Show all relevant variables
railway variables | grep -E "(CF_|NODE_ENV|EXPO_PUBLIC_API_URL|AI_|FOOD_ANALYZE|LOG_LEVEL|PORT)" | head -20

echo ""
echo "🚀 Deployment Status:"
echo "===================="

# Trigger deployment
echo "Triggering Railway deployment..."
railway up

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "🔍 Next Steps:"
    echo "=============="
    echo ""
    echo "1. 🌐 Test health endpoint:"
    echo "   curl https://gofitai-production.up.railway.app/api/health"
    echo ""
    echo "2. 📸 Test food photo analysis:"
    echo "   curl -X POST -F \"foodImage=@temp/test_food.jpg\" https://gofitai-production.up.railway.app/api/analyze-food"
    echo ""
    echo "3. 📊 Monitor deployment logs:"
    echo "   railway logs"
    echo ""
    echo "🎉 Your GoFitAI app with Cloudflare Workers AI is now deployed!"
    echo ""
else
    echo "❌ Deployment failed. Check Railway logs for details:"
    echo "railway logs"
    exit 1
fi

echo ""
echo "📖 Help & Troubleshooting:"
echo "=========================="
echo ""
echo "If you don't have Cloudflare credentials yet:"
echo "1. 🌐 Go to https://dash.cloudflare.com/"
echo "2. 📝 Sign up or log in"
echo "3. 🆔 Copy your Account ID from the right sidebar"
echo "4. 🔑 Go to My Profile → API Tokens → Create Token"
echo "5. 🤖 Use 'Workers AI' template or create custom token with Workers AI permissions"
echo "6. ✅ Enable Workers AI in your Cloudflare dashboard"
echo ""
echo "🔧 Common Issues:"
echo "- 'Invalid API token' → Check CF_API_TOKEN permissions"
echo "- 'Account not found' → Verify CF_ACCOUNT_ID is correct"
echo "- 'Model not available' → Ensure Workers AI is enabled"
