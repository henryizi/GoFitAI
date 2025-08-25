#!/bin/bash
# Railway Environment Variables Setup Script
# Run this after completing Railway CLI login

echo "🚂 Setting up Railway environment variables..."

# Link to your Railway project
railway link

# Set Supabase credentials
railway variables set EXPO_PUBLIC_SUPABASE_URL="https://lmfdgnxertwrhbjhrcby.supabase.co"
railway variables set EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"
railway variables set SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyNzQyNSwiZXhwIjoyMDY3OTAzNDI1fQ.IILiLRTjc1K2pCexiUtgdEfATUF7suqcYVn41tDXlKY"

# Set AI provider credentials
railway variables set AI_PROVIDER="deepseek"
railway variables set DEEPSEEK_API_KEY="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"
railway variables set DEEPSEEK_API_URL="https://api.deepseek.com/chat/completions"
railway variables set DEEPSEEK_MODEL="deepseek-chat"

# Set additional configuration
railway variables set NODE_ENV="production"
railway variables set PORT="4000"

echo "✅ Environment variables set! Triggering redeploy..."

# Redeploy the service
railway up --detach

echo "🎉 Railway deployment updated with all required environment variables!"
echo "🧪 Test your app now - weight entries should work!"



