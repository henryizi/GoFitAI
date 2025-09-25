#!/bin/bash

echo "🚂 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Link to the project
echo "🔗 Linking to Railway project..."
railway link

# Trigger deployment
echo "🚀 Triggering deployment..."
railway up

echo ""
echo "⏱️  Wait 2-3 minutes for deployment to complete"
echo "🌐 Your app will be available at: https://gofitai-production.up.railway.app"
echo ""
echo "🧪 Test your deployment with:"
echo "curl -X POST -H \"Content-Type: application/json\" -d '{\"profile\": {\"full_name\": \"Test User\", \"gender\": \"male\", \"age\": 30, \"training_level\": \"intermediate\", \"primary_goal\": \"muscle_gain\", \"workout_frequency\": \"4\"}}' https://gofitai-production.up.railway.app/api/generate-workout-plan"


