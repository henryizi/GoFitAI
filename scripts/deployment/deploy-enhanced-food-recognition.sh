#!/bin/bash

# 🍽️ Enhanced Food Recognition Deployment Script
# Deploys the improved food recognition system to Railway

echo "🍽️ Deploying Enhanced Food Recognition System..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "server/index.js" ]; then
    echo "❌ Error: server/index.js not found. Please run this script from the GoFitAI root directory."
    exit 1
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "🧪 Testing Enhanced Food Recognition:"
    echo "1. Upload a food image (e.g., French Toast, Pizza, Sushi)"
    echo "2. Check if it recognizes the specific dish name"
    echo "3. Verify the JSON response includes:"
    echo "   - dishName: Specific dish (e.g., 'French Toast')"
    echo "   - cuisineType: Cuisine category (e.g., 'American Breakfast')"
    echo "   - cookingMethod: Preparation method (e.g., 'pan-fried')"
    echo ""
    echo "📊 Expected improvements:"
    echo "   ❌ Before: 'triangular pieces of bread with toppings'"
    echo "   ✅ After: 'French Toast with maple syrup and butter'"
    echo ""
    echo "🔍 Monitor the logs for recognition accuracy"
    echo "📝 Collect user feedback on dish recognition"
    echo ""
    echo "Ready to test! 🍳✨"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

