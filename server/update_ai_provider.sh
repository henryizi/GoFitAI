#!/bin/bash

# Update server .env file
echo "Updating server .env file..."
cd server
sed -i '' 's/^AI_PROVIDER=.*/AI_PROVIDER=deepseek/' .env 2>/dev/null || echo "AI_PROVIDER=deepseek" >> .env
echo "DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions" >> .env
echo "DEEPSEEK_MODEL=deepseek-chat" >> .env
echo "Server .env updated!"

# Update client .env file
echo "Updating client .env file..."
cd ..
echo "EXPO_PUBLIC_AI_PROVIDER=deepseek" >> .env
echo "EXPO_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions" >> .env
echo "EXPO_PUBLIC_DEEPSEEK_MODEL=deepseek-chat" >> .env
echo "Client .env updated!"

echo "Configuration complete! Please restart your server for changes to take effect."
