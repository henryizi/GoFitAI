#!/bin/bash

# Setup script for GoFitAI environment configuration
echo "Setting up GoFitAI environment configuration..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Local API Server - Use your actual local IP address
EXPO_PUBLIC_API_URL=http://192.168.0.199:4000

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# AI Service Configuration (OpenRouter)
EXPO_PUBLIC_DEEPSEEK_API_KEY=your_openrouter_api_key_here
EXPO_PUBLIC_DEEPSEEK_API_URL=https://openrouter.ai/api/v1/chat/completions
EXPO_PUBLIC_DEEPSEEK_MODEL=deepseek/deepseek-chat
EXPO_PUBLIC_AI_TIMEOUT_MS=45000
# Set to 1 to enable verbose client-side AI logs
EXPO_PUBLIC_AI_VERBOSE=0

# Storage Configuration
EXPO_PUBLIC_SUPABASE_STORAGE_URL=your_supabase_storage_url_here

# Monitoring / Analytics
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
EXPO_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# App Configuration
EXPO_PUBLIC_APP_NAME=GoFitAI
EXPO_PUBLIC_APP_VERSION=1.0.0
EOF
    echo "✅ .env file created with your local IP (192.168.0.199:4000)"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔧 Configuration Summary:"
echo "   • Server IP: 192.168.0.199:4000"
echo "   • All service files updated to use this IP as primary"
echo "   • Fallback URLs still include localhost for development flexibility"
echo ""
echo "📱 Next steps:"
echo "   1. Restart your Expo app"
echo "   2. The app should now connect to your server at 192.168.0.199:4000"
echo "   3. Check the console logs to confirm connection"
echo ""
echo "🚀 Your server connection should now work properly!"

