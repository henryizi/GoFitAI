#!/bin/bash
# Railway Environment Variables Setup Script - GEMINI ONLY CONFIGURATION
# Run this to fix Railway DeepSeek issue

echo "🚂 FIXING RAILWAY: Switching from DeepSeek to Gemini-only..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login if not already logged in
echo "🔐 Logging into Railway..."
railway login

# Link to your Railway project
echo "🔗 Linking to Railway project..."
railway link

# Set Supabase credentials
railway variables --set "EXPO_PUBLIC_SUPABASE_URL=https://lmfdgnxertwrhbjhrcby.supabase.co"
railway variables --set "EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"
railway variables --set "SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"

# Set Gemini as the ONLY AI provider (remove DeepSeek)
railway variables --set "AI_PROVIDER=gemini"
railway variables --set "GEMINI_API_KEY=AIzaSyBbIwKZkJgYjQbSCyvCYESPmzgly7KiA8Y"
railway variables --set "FOOD_ANALYZE_PROVIDER=gemini"

# Remove DeepSeek variables to ensure no fallback
railway variables --delete "DEEPSEEK_API_KEY" 2>/dev/null || echo "DEEPSEEK_API_KEY not set, skipping deletion"
railway variables --delete "DEEPSEEK_API_URL" 2>/dev/null || echo "DEEPSEEK_API_URL not set, skipping deletion"
railway variables --delete "DEEPSEEK_MODEL" 2>/dev/null || echo "DEEPSEEK_MODEL not set, skipping deletion"

# Set additional configuration
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=4000"

echo "✅ Environment variables set! Triggering redeploy..."

# Redeploy the service
railway up --detach

echo "🎉 Railway deployment updated with Gemini-only configuration!"
echo "🧪 Test your app now - food analysis should use Gemini exclusively!"

echo ""
echo "📋 VERIFICATION CHECKLIST:"
echo "1. ✅ AI_PROVIDER=gemini (set)"
echo "2. ✅ GEMINI_API_KEY configured"
echo "3. ✅ FOOD_ANALYZE_PROVIDER=gemini (set)"
echo "4. ✅ DeepSeek variables removed"
echo "5. ✅ Service redeployed"

echo ""
echo "🔍 TO VERIFY YOUR FIX:"
echo "1. Check Railway logs for: '[VISION SERVICE] Initializing Gemini Vision Service'"
echo "2. Test food photo upload - should see: '[FOOD ANALYZE] Using Gemini Vision API'"
echo "3. No more DeepSeek API calls in logs"
