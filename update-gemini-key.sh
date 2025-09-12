#!/bin/bash
# Update Gemini API Key Script
# Run this after getting a new API key from Google AI Studio

echo "🔑 UPDATING GEMINI API KEY"
echo ""

# Check if new API key is provided
if [ -z "$1" ]; then
    echo "❌ Please provide the new API key as an argument"
    echo "Usage: ./update-gemini-key.sh YOUR_NEW_API_KEY"
    echo ""
    echo "To get a new API key:"
    echo "1. Go to https://aistudio.google.com/"
    echo "2. Sign in and click 'Get API Key'"
    echo "3. Create or copy an existing API key"
    echo "4. Run: ./update-gemini-key.sh YOUR_NEW_KEY"
    exit 1
fi

NEW_API_KEY="$1"

echo "🔧 Updating API key in .env file..."
# Update .env file
sed -i.bak "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$NEW_API_KEY/" .env
sed -i.bak "s/EXPO_PUBLIC_GEMINI_API_KEY=.*/EXPO_PUBLIC_GEMINI_API_KEY=$NEW_API_KEY/" .env

echo "🔧 Updating Railway deployment scripts..."
# Update Railway scripts
sed -i.bak "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$NEW_API_KEY/" server/fix-railway-gemini.sh
sed -i.bak "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$NEW_API_KEY/" scripts/deployment/RAILWAY_QUICK_FIX.sh

echo "🧹 Cleaning up backup files..."
rm -f .env.bak server/fix-railway-gemini.sh.bak scripts/deployment/RAILWAY_QUICK_FIX.sh.bak

echo ""
echo "✅ API key updated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your server: cd server && npm start"
echo "2. Test the API endpoints"
echo "3. Deploy to Railway if needed"
echo ""
echo "🧪 Test with:"
echo "curl -X POST -H \"Content-Type: application/json\" -d '{\"imageDescription\": \"grilled chicken\"}' http://localhost:4000/api/analyze-food"
















































































































































































































