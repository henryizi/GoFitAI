#!/bin/bash

# Switch Vision Model to Llava 1.5
echo "🎯 Switching vision model to Llava 1.5 for better food recognition..."

# Update local .env file
if [ -f .env ]; then
  sed -i.bak 's|CF_VISION_MODEL=@cf/unum/uform-gen2-qwen-500m.*|CF_VISION_MODEL=@cf/llava-1.5-7b-hf|g' .env
  echo "✅ Updated local .env file"
else
  echo "⚠️  No .env file found locally"
fi

# Update Railway environment variables
echo "🚀 Updating Railway environment variables..."
railway variables --set "CF_VISION_MODEL=@cf/llava-1.5-7b-hf"

echo ""
echo "🎉 Vision model switched to: @cf/llava-1.5-7b-hf"
echo ""
echo "📋 What this means:"
echo "   • Better food recognition accuracy"
echo "   • Improved dish name detection"
echo "   • More accurate nutrition estimates"
echo "   • Better cuisine type identification"
echo ""
echo "🔄 Restart your server to apply changes:"
echo "   npm run server"
echo ""
echo "🧪 Test with your food photos!"
