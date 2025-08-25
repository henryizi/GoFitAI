#!/bin/bash

# 🚂 Deploy SnapBodyAI to Railway with Cloudflare Photo Analysis
# This script sets up all environment variables and deploys to Railway

set -e

echo "🚂 SnapBodyAI Railway Deployment with Cloudflare"
echo "=================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Set environment variables
echo "🔧 Setting environment variables..."

# Database Configuration
echo "📊 Setting Supabase configuration..."
railway variables set EXPO_PUBLIC_SUPABASE_URL="https://lmfdgnxertwrhbjhrcby.supabase.co"
railway variables set SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"
railway variables set EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"

# AI Configuration
echo "🤖 Setting AI provider configuration..."
railway variables set AI_PROVIDER="deepseek"
railway variables set DEEPSEEK_API_KEY="ozmpEQmGss_pPLZIyI4E-7obcaZnxHS5jik5NYnv"
railway variables set DEEPSEEK_API_URL="https://api.deepseek.com/chat/completions"
railway variables set DEEPSEEK_MODEL="deepseek-chat"
railway variables set AI_DEEPSEEK_ONLY="true"

# 🌐 Cloudflare Configuration (REQUIRED FOR PHOTO ANALYSIS)
echo "🌐 Setting Cloudflare Workers AI configuration..."
echo ""
echo "⚠️  IMPORTANT: You need to provide your Cloudflare credentials!"
echo "   1. Get Account ID from https://dash.cloudflare.com (right sidebar)"
echo "   2. Create API Token at My Profile → API Tokens → Create Token"
echo "   3. Set permissions: Account - Cloudflare Workers:Edit"
echo ""

read -p "Enter your Cloudflare Account ID: " cf_account_id
read -p "Enter your Cloudflare API Token: " cf_api_token

if [ -z "$cf_account_id" ] || [ -z "$cf_api_token" ]; then
    echo "❌ Cloudflare credentials are required for photo analysis!"
    echo "   Photo analysis will not work without these credentials."
    echo "   You can set them later in Railway dashboard under Variables tab."
else
    railway variables set CF_ACCOUNT_ID="$cf_account_id"
    railway variables set CF_API_TOKEN="$cf_api_token"
fi

railway variables set CF_VISION_MODEL="@cf/llava-1.5-7b-hf"

# App Configuration
echo "🔧 Setting app configuration..."
railway variables set NODE_ENV="production"
railway variables set PORT="4000"
railway variables set EXPO_PUBLIC_API_URL="https://gofitai-production.up.railway.app"
railway variables set USDA_FDC_API_KEY="1lhmKZ3NzzMJ9GONtJZRoJFTwD70JVLXVj0ZoLzZ"
railway variables set FOOD_ANALYZE_PROVIDER="deepseek"
railway variables set AI_REQUEST_TIMEOUT="120000"
railway variables set LOG_LEVEL="info"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test your deployment:"
echo "   Health check: curl https://gofitai-production.up.railway.app/api/health"
echo "   Photo analysis: Upload a food photo in the app"
echo ""
echo "📊 Monitor logs: railway logs"
echo "🔧 Update variables: railway variables"
echo ""
echo "🌐 Cloudflare photo analysis is now configured!"
echo "   - Food photos will be analyzed using Cloudflare Workers AI"
echo "   - Body analysis uses DeepSeek for text-based AI"
echo "   - All other AI features use DeepSeek"

