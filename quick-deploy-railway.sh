#!/bin/bash

echo "🚂 Quick Railway Deployment for GoFitAI"
echo "========================================"
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway:"
    railway login
fi

# Show current project info
echo "📊 Current Railway Project:"
railway status
echo ""

# Check for important environment variables
echo "🔍 Checking environment variables..."
echo ""

# Deploy to Railway
echo "🚀 Deploying to Railway..."
echo ""
railway up

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next Steps:"
echo "1. Monitor logs: railway logs"
echo "2. Get domain: railway domain"
echo "3. Test health: curl \$(railway domain)/api/health"
echo ""
echo "🔧 Need to set environment variables?"
echo "   railway variables set GEMINI_API_KEY=\"your-key\""
echo "   railway variables set SUPABASE_URL=\"your-url\""
echo "   railway variables set SUPABASE_SERVICE_KEY=\"your-key\""
echo ""

