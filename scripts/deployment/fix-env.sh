#!/bin/bash

echo "🔧 Fixing Environment Variables for React Native..."

# Source the .env file
if [ -f .env ]; then
    echo "✅ Found .env file"
    
    # Export environment variables
    export $(grep -v '^#' .env | xargs)
    
    # Verify they're set
    echo "📋 Environment Variables Status:"
    echo "- EXPO_PUBLIC_SUPABASE_URL: ${EXPO_PUBLIC_SUPABASE_URL:0:30}..."
    echo "- EXPO_PUBLIC_SUPABASE_ANON_KEY: ${EXPO_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
    
    # Clear any cached builds
    echo "🧹 Clearing Expo cache..."
    if command -v npx &> /dev/null; then
        npx expo start --clear
    else
        echo "⚠️  Please run: npx expo start --clear"
    fi
else
    echo "❌ .env file not found!"
    echo "Please ensure .env file exists with Supabase credentials"
fi

