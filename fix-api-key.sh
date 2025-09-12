#!/bin/bash
# Fix malformed Gemini API key

echo "🔧 FIXING MALFORMED GEMINI API KEY"
echo ""

# Check if new API key is provided
if [ -z "$1" ]; then
    echo "❌ Please provide the new API key as an argument"
    echo "Usage: ./fix-api-key.sh YOUR_NEW_API_KEY"
    echo ""
    echo "Example:"
    echo "./fix-api-key.sh AIzaSyYourNewValidKeyHere123456789012345678901234"
    echo ""
    echo "To get a new API key:"
    echo "1. Go to https://aistudio.google.com/"
    echo "2. Sign in and click 'Get API Key'"
    echo "3. Create a new API key"
    echo "4. Copy the FULL key (should be ~39 characters)"
    exit 1
fi

NEW_API_KEY="$1"

# Validate API key format
if [[ ! $NEW_API_KEY =~ ^AIzaSy[A-Za-z0-9_-]{35}$ ]]; then
    echo "❌ Invalid API key format!"
    echo "Expected format: AIzaSy + 35 characters"
    echo "Your key length: ${#NEW_API_KEY} characters"
    echo "Your key: $NEW_API_KEY"
    exit 1
fi

echo "✅ Valid API key format detected"
echo ""

# Backup current .env
cp .env .env.backup.$(date +%s)
echo "📦 Backed up current .env file"

# Update .env file (remove line breaks and fix format)
sed -i.bak "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$NEW_API_KEY/" .env
sed -i.bak "s/EXPO_PUBLIC_GEMINI_API_KEY=.*/EXPO_PUBLIC_GEMINI_API_KEY=$NEW_API_KEY/" .env

# Clean up backup files
rm -f .env.bak

echo "✅ API key updated successfully!"
echo ""
echo "🔍 Verification:"
echo "GEMINI_API_KEY: $(grep GEMINI_API_KEY .env | cut -d'=' -f2)"
echo ""
echo "📋 Next steps:"
echo "1. Restart your server: cd server && npm start"
echo "2. Test the API endpoints"
echo ""
echo "🧪 Test with:"
echo "curl -X POST -H \"Content-Type: application/json\" -d '{\"imageDescription\": \"grilled chicken\"}' http://localhost:4000/api/analyze-food"
















































































































































































































