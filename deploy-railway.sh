#!/bin/bash

echo "🚀 Deploying SnapBodyAI to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    echo "railway login"
    exit 1
fi

# Create new project if it doesn't exist
echo "📦 Creating Railway project..."
railway init --name snapbodyai

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=4001

# Deploy the application
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at: https://snapbodyai-production.up.railway.app"
echo ""
echo "📋 Next steps:"
echo "1. Set your API keys in Railway dashboard:"
echo "   - GEMINI_API_KEY"
echo "   - DEEPSEEK_API_KEY (optional)"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"
echo ""
echo "2. Test your deployment:"
echo "   curl https://snapbodyai-production.up.railway.app/api/health"
echo ""
echo "3. Monitor logs:"
echo "   railway logs"




