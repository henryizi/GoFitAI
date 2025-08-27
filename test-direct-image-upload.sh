#!/bin/bash

# 🍽️ Test Direct Image Upload Script
# This script tests the server-side vision AI directly, bypassing client-side processing

echo "🍽️ Testing Direct Image Upload to Server"
echo "========================================"

# Check if we have a test image
if [ ! -f "test-food-image.jpg" ]; then
    echo "❌ Test image not found. Please create a test-food-image.jpg file first."
    echo ""
    echo "📸 To create a test image:"
    echo "   1. Take a photo of food (e.g., eggs, cereal, pizza)"
    echo "   2. Save it as 'test-food-image.jpg' in this directory"
    echo "   3. Run this script again"
    exit 1
fi

echo "✅ Test image found: test-food-image.jpg"
echo ""

# Check server status
echo "🔍 Checking server status..."
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Server is running on localhost:4000"
    API_URL="http://localhost:4000"
elif curl -s https://gofitai-production.up.railway.app/health > /dev/null 2>&1; then
    echo "✅ Railway server is running"
    API_URL="https://gofitai-production.up.railway.app"
else
    echo "❌ No server found. Please start your server first:"
    echo "   npm run start-server"
    exit 1
fi

echo ""
echo "🚀 Testing direct image upload to: $API_URL"
echo ""

# Test the image upload
echo "📤 Uploading image to /api/analyze-food..."
echo "   This will test your server-side vision AI directly"
echo ""

# Upload the image and analyze the response
response=$(curl -s -X POST \
    -F "foodImage=@test-food-image.jpg" \
    "$API_URL/api/analyze-food")

echo "📥 Server Response:"
echo "=================="
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "🔍 Analysis Results:"
echo "==================="

# Check if the response contains the enhanced food recognition
if echo "$response" | grep -q "dishName"; then
    echo "✅ Enhanced food recognition working!"
    echo "   The server is recognizing specific dish names"
else
    echo "❌ Enhanced food recognition not working"
    echo "   The server might be using fallback analysis"
fi

if echo "$response" | grep -q "cuisineType"; then
    echo "✅ Cuisine type recognition working!"
else
    echo "❌ Cuisine type recognition not working"
fi

if echo "$response" | grep -q "cookingMethod"; then
    echo "✅ Cooking method recognition working!"
else
    echo "❌ Cooking method recognition not working"
fi

echo ""
echo "🎯 Expected vs Actual:"
echo "======================"
echo "Expected: Specific dish names (e.g., 'Fried Eggs', 'Cereal with Berries')"
echo "Actual: Check the response above"

echo ""
echo "🧪 Next Steps:"
echo "=============="
echo "1. If this works correctly, the issue is client-side vision AI"
echo "2. If this doesn't work, the issue is server-side vision AI"
echo "3. Check server logs for more details: tail -f server/server.log"

echo ""
echo "✨ Test complete! 🍳"

