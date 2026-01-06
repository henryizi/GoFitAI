#!/bin/bash

# Build and Submit to App Store
# Usage: ./scripts/build-and-submit.sh [production|testflight]

PROFILE=${1:-production}

echo "🚀 Building iOS app with profile: $PROFILE"
eas build --platform ios --profile $PROFILE --non-interactive

if [ $? -eq 0 ]; then
  echo "✅ Build successful! Submitting to App Store..."
  eas submit --platform ios --profile $PROFILE --latest --non-interactive
  echo "✅ Submission complete!"
else
  echo "❌ Build failed. Skipping submission."
  exit 1
fi




























