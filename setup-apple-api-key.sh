#!/bin/bash

# Set App Store Connect API credentials for EAS
export EXPO_APPLE_API_KEY_PATH="/Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8"
export EXPO_APPLE_API_KEY_ID="BGB44QUU2A"
export EXPO_APPLE_API_ISSUER_ID="c47cbb7b-15c5-41b8-b602-e6bbb595007a"

echo "✅ App Store Connect API credentials set:"
echo "   Key ID: $EXPO_APPLE_API_KEY_ID"
echo "   Issuer ID: $EXPO_APPLE_API_ISSUER_ID"
echo "   Key Path: $EXPO_APPLE_API_KEY_PATH"
echo ""
echo "Now you can run EAS commands like:"
echo "  eas submit --platform ios --profile production"

