#!/bin/bash

# Update server .env file
echo "Updating server .env file..."
cd server
sed -i '' 's/AI_PROVIDER=openai/AI_PROVIDER=openrouter/' .env
echo "OPENROUTER_API_KEY=sk-or-v1-a2b7a5c5d1c3a2d2b5d9e7b9c2b1d7a8d9c9b7a5c5d1c3a2d2b5d9e7b9c2b1d7a8d9c9" >> .env
echo "OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions" >> .env
echo "OPENROUTER_MODEL=deepseek/deepseek-chat" >> .env
echo "Server .env updated!"

# Update client .env file
echo "Updating client .env file..."
cd ..
echo "EXPO_PUBLIC_AI_PROVIDER=openrouter" >> .env
echo "EXPO_PUBLIC_DEEPSEEK_API_KEY=sk-or-v1-a2b7a5c5d1c3a2d2b5d9e7b9c2b1d7a8d9c9b7a5c5d1c3a2d2b5d9e7b9c2b1d7a8d9c9" >> .env
echo "EXPO_PUBLIC_DEEPSEEK_API_URL=https://openrouter.ai/api/v1/chat/completions" >> .env
echo "EXPO_PUBLIC_DEEPSEEK_MODEL=deepseek/deepseek-chat" >> .env
echo "EXPO_PUBLIC_FOOD_ANALYZE_PROVIDER=cloudflare" >> .env
echo "Client .env updated!"

echo "Configuration complete! Please restart your server for changes to take effect."
