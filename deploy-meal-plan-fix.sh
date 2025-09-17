#!/bin/bash

echo "🚂 Deploying Updated Railway Version with Meal Plan Generation..."
echo ""

# Check if railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Change to server directory
cd server

echo "📋 Current files:"
ls -la index-railway-clean.js

echo ""
echo "🚀 Deploying to Railway..."

# Deploy using the clean railway version
railway up --detach

echo ""
echo "⏱️  Deployment started. This will take 2-3 minutes..."
echo "🌐 Your app will be available at: https://gofitai-production.up.railway.app"
echo ""
echo "🧪 Once deployed, test with:"
echo "curl -X POST -H \"Content-Type: application/json\" -d '{\"userId\": \"test-123\"}' https://gofitai-production.up.railway.app/api/generate-daily-meal-plan"
echo ""
echo "✅ Deployment initiated successfully!"


