#!/bin/bash

echo "🌐 Deploy Cloudflare Variables to Railway"
echo "========================================"
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check current Cloudflare variables
echo "📋 Current Cloudflare Variables:"
railway variables | grep "CF_" || echo "No Cloudflare variables found"

echo ""
echo "🔧 Setting Cloudflare Workers AI Variables..."
echo ""

# Set Cloudflare variables
railway variables --set "CF_ACCOUNT_ID=b250a9011545cb1ec917651da27c0594"
railway variables --set "CF_API_TOKEN=ozmpEQmGss_pPLZIyI4E-7obcaZnxHS5jik5NYnv"
railway variables --set "CF_VISION_MODEL=@cf/llava-1.5-7b-hf"

if [ $? -eq 0 ]; then
    echo "✅ Cloudflare variables deployed successfully!"
    echo ""
    echo "📋 Updated Variables:"
    railway variables | grep "CF_"
    echo ""
    echo "🚀 The changes will trigger a new deployment automatically."
    echo "   Monitor the deployment with: railway logs"
else
    echo "❌ Failed to deploy Cloudflare variables"
    exit 1
fi
