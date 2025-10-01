#!/bin/bash

# Script to set up mobile app environment configuration
echo "📱 Setting up mobile app environment configuration..."

# Get the local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not determine local IP address"
    echo "Please manually set your IP in the .env file"
    exit 1
fi

echo "🌐 Detected local IP: $LOCAL_IP"

# Update .env file for development
if [ -f ".env" ]; then
    echo "📝 Updating .env file for development..."
    sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$LOCAL_IP:4000|" .env
    echo "✅ Updated .env file to use local IP: http://$LOCAL_IP:4000"
else
    echo "⚠️ .env file not found - creating it..."
    cat > .env << EOF
# Local Development Configuration
EXPO_PUBLIC_API_URL=http://$LOCAL_IP:4000

# Gemini AI Configuration (add your actual key)
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash

# Supabase Configuration (update with your actual values)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Other configurations
EXPO_PUBLIC_AI_TIMEOUT_MS=45000
EXPO_PUBLIC_AI_VERBOSE=0
EOF
    echo "✅ Created .env file with local IP configuration"
fi

# Update app.json for development
if [ -f "app.json" ]; then
    echo "📝 Updating app.json for development..."
    sed -i '' "s|\"EXPO_PUBLIC_API_URL\": \".*\"|\"EXPO_PUBLIC_API_URL\": \"http://$LOCAL_IP:4000\"|" app.json
    echo "✅ Updated app.json to use local IP: http://$LOCAL_IP:4000"
fi

echo ""
echo "🎉 Mobile app environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure your development server is running: npm run dev"
echo "2. Restart your Expo development server: npx expo start --clear"
echo "3. The mobile app should now connect to your local server"
echo ""
echo "🔄 To switch back to production:"
echo "   - Update .env: EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app"
echo "   - Update app.json: \"EXPO_PUBLIC_API_URL\": \"https://gofitai-production.up.railway.app\""
echo ""
echo "⚡ Your mobile app will now use AI-generated workout plans instead of the fallback system!"

