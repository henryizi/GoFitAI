#!/bin/bash
# 🚂 Fix Railway Deployment - Switch to Gemini Only Configuration
# This will update your Railway environment to match your working local setup

echo "🚂 FIXING RAILWAY: Switching to pure Gemini configuration..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
    echo ""
fi

# Login if not already logged in
echo "🔐 Logging into Railway..."
railway login
echo ""

# Link to your Railway project (this should work if you've used Railway before)
echo "🔗 Linking to Railway project..."
railway link
echo ""

# Set Supabase credentials (keep existing)
echo "📊 Setting Supabase configuration..."
railway variables set EXPO_PUBLIC_SUPABASE_URL="https://lmfdgnxertwrhbjhrcby.supabase.co"
railway variables set EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"
railway variables set SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"

# Set Gemini as the ONLY AI provider
echo "🤖 Setting Gemini as the exclusive AI provider..."
railway variables set AI_PROVIDER="gemini"
railway variables set GEMINI_API_KEY="AIzaSyBbIwKZkJgYjQbSCyvCYESPmzgly7KiA8Y"
railway variables set FOOD_ANALYZE_PROVIDER="gemini"

# Remove DeepSeek variables to ensure no fallback attempts
echo "🗑️  Removing DeepSeek configuration..."
railway variables unset DEEPSEEK_API_KEY 2>/dev/null || echo "DEEPSEEK_API_KEY not set, skipping deletion"
railway variables unset DEEPSEEK_API_URL 2>/dev/null || echo "DEEPSEEK_API_URL not set, skipping deletion"
railway variables unset DEEPSEEK_MODEL 2>/dev/null || echo "DEEPSEEK_MODEL not set, skipping deletion"
railway variables unset AI_DEEPSEEK_ONLY 2>/dev/null || echo "AI_DEEPSEEK_ONLY not set, skipping deletion"

# Remove Cloudflare variables since we're not using it
echo "🗑️  Removing Cloudflare configuration (not needed with Gemini Vision)..."
railway variables unset CF_ACCOUNT_ID 2>/dev/null || echo "CF_ACCOUNT_ID not set, skipping deletion"
railway variables unset CF_API_TOKEN 2>/dev/null || echo "CF_API_TOKEN not set, skipping deletion"
railway variables unset CF_VISION_MODEL 2>/dev/null || echo "CF_VISION_MODEL not set, skipping deletion"

# Set production configuration
echo "⚙️  Setting production configuration..."
railway variables set NODE_ENV="production"
railway variables set PORT="4000"
railway variables set AI_REQUEST_TIMEOUT="180000"
railway variables set LOG_LEVEL="info"

echo ""
echo "✅ Environment variables updated! Your Railway deployment now matches your working local setup."
echo "🔄 Railway will automatically redeploy with the new configuration."
echo ""
echo "⏱️  Wait 2-3 minutes for the deployment to complete, then test with:"
echo "curl -X POST -H \"Content-Type: application/json\" -d '{\"imageDescription\": \"grilled chicken\"}' https://gofitai-production.up.railway.app/api/analyze-food"
echo ""
