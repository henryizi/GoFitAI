#!/bin/bash

# Deploy Nutrition AI Fix to Railway
# This script ensures the correct server file is deployed with mathematical calculations only

echo "🚀 Deploying Nutrition AI Fix to Railway..."

# Check if we're in the correct directory
if [ ! -f "server/index.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Verify the main server file has mathematical calculations (not AI)
if grep -q "Starting AI generation process" server/index.js; then
    echo "❌ Error: Main server file still contains AI calls for nutrition!"
    echo "Please ensure server/index.js uses mathematical calculations only"
    exit 1
fi

# Verify nutrition plan generation uses math
if ! grep -q "Generating plan with mathematical calculations" server/index.js; then
    echo "❌ Error: Main server file doesn't have mathematical nutrition generation"
    exit 1
fi

echo "✅ Verified server/index.js uses mathematical calculations for nutrition"

# Show what we're deploying
echo "📋 Deployment Summary:"
echo "   • Server file: server/index.js (mathematical calculations only)"
echo "   • Nutrition plan generation: Mathematical (no AI)"
echo "   • Nutrition re-evaluation: Mathematical (no AI)" 
echo "   • AI functionality: Only for workout plans and chat features"

# Check Railway configuration
if [ -f "railway.json" ]; then
    echo "✅ Railway configuration found:"
    cat railway.json | grep -E "(startCommand|healthcheckPath)"
else
    echo "⚠️  No railway.json found - using default configuration"
fi

# Commit the changes
echo "📝 Committing nutrition AI removal changes..."
git add server/index.js
git commit -m "Remove AI from nutrition: Use mathematical calculations only

- Removed composeNutritionPrompt() - dead code from old AI system
- Removed composeReevaluationPrompt() - dead code from old AI system  
- Nutrition plan generation now uses mathematical calculations exclusively
- Nutrition re-evaluation uses mathematical calculations exclusively
- AI calls removed from all nutrition functionality
- Only workout plans and chat features still use AI

Fixes Railway logs showing AI calls for nutrition functionality."

# Deploy to Railway
echo "🚂 Deploying to Railway..."
if command -v railway &> /dev/null; then
    railway up
    echo "✅ Deployment initiated via Railway CLI"
else
    echo "📤 Push to trigger Railway deployment..."
    git push origin main
    echo "✅ Changes pushed - Railway will auto-deploy"
fi

echo ""
echo "🎯 Expected Results After Deployment:"
echo "   • Railway logs should show: 'Generating plan with mathematical calculations'"
echo "   • No more AI calls for nutrition functionality"
echo "   • Nutrition targets calculated using Henry/Oxford BMR formula"
echo "   • Consistent calorie values across all nutrition screens"
echo "   • AI calls only for workout plans and chat features"
echo ""
echo "🔍 To verify the fix:"
echo "   1. Check Railway logs for nutrition plan generation"
echo "   2. Create a new nutrition plan in the app"
echo "   3. Use the 'Recalculate Targets' button"
echo "   4. Verify no AI-related log messages for nutrition"
echo ""
echo "✨ Nutrition AI Removal Complete!"
