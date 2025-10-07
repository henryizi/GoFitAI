#!/bin/bash

echo "🚀 Fixing Railway Timeout Issue"
echo "================================"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

echo "📋 Current Railway Variables:"
railway variables

echo ""
echo "🔧 Setting correct timeout environment variables..."

# Set AI_REQUEST_TIMEOUT to 300 seconds (5 minutes) for complex AI requests
railway variables set AI_REQUEST_TIMEOUT="300000"

# Set additional timeout variables if they exist
railway variables set AI_CHAT_TIMEOUT="300000"

echo ""
echo "📋 Updated Railway Variables:"
railway variables

echo ""
echo "🔄 Forcing Railway redeploy to use latest code..."

# Create a deployment trigger file to force redeploy
echo "# Deployment trigger - $(date)" > DEPLOY_TRIGGER.txt

# Add and commit the trigger
git add DEPLOY_TRIGGER.txt
git commit -m "Force Railway redeploy - Fix timeout issue $(date)"

# Push to trigger redeploy
git push origin main

echo ""
echo "✅ Railway redeploy triggered!"
echo ""
echo "📊 Monitor deployment:"
echo "   railway logs --follow"
echo ""
echo "🧪 Test after deployment:"
echo "   curl https://gofitai-production.up.railway.app/health"
echo ""
echo "⏱️  The new timeout settings:"
echo "   - AI_REQUEST_TIMEOUT: 300 seconds (5 minutes)"
echo "   - Gemini internal timeout: 240 seconds (4 minutes)"
echo "   - Total request timeout: 300 seconds (5 minutes)"
