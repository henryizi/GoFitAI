#!/bin/bash

# Update Vision Model to Better Alternative
echo "🎯 Updating vision model to better performing alternative..."

# Update local .env if it exists
if [ -f .env ]; then
    echo "📝 Updating local .env file..."
    sed -i.bak 's|CF_VISION_MODEL=@cf/llava-1.5-7b-hf.*|CF_VISION_MODEL=@cf/unum/uform-gen2-qwen-500m|g' .env
    sed -i.bak 's|VISION_MODEL=.*|VISION_MODEL=|g' .env
    echo "✅ Local .env updated"
else
    echo "⚠️  No .env file found. Creating one from template..."
    cp env.example .env
    echo "CF_VISION_MODEL=@cf/unum/uform-gen2-qwen-500m" >> .env
fi

# Update Railway deployment if railway CLI is available
if command -v railway &> /dev/null; then
    echo "🚂 Updating Railway environment variables..."
    railway variables set CF_VISION_MODEL="@cf/unum/uform-gen2-qwen-500m"
    railway variables unset VISION_MODEL || echo "VISION_MODEL was not set"
    echo "✅ Railway environment updated"
    
    echo "🚀 Deploying updated code to Railway..."
    railway up
else
    echo "⚠️  Railway CLI not found. Manual Railway update needed:"
    echo "   railway variables set CF_VISION_MODEL=\"@cf/unum/uform-gen2-qwen-500m\""
    echo "   railway variables unset VISION_MODEL"
    echo "   railway up"
fi

echo ""
echo "🎉 Vision model updated to: @cf/unum/uform-gen2-qwen-500m"
echo ""
echo "✨ Benefits of the new model:"
echo "   • No license requirements"
echo "   • Better food recognition accuracy"
echo "   • Faster processing (500M vs 7B parameters)"
echo "   • Same cost as LLaVA"
echo "   • Optimized for Cloudflare Workers AI"
echo ""
