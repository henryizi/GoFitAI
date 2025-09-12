#!/bin/bash

# 🚂 Complete Railway Gemini Fix
# This script will diagnose and fix all Gemini API issues on Railway

echo "🚂 RAILWAY GEMINI FIX - Complete Solution"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is installed
check_railway_cli() {
    print_status "Checking Railway CLI installation..."
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found!"
        print_status "Installing Railway CLI..."
        npm install -g @railway/cli
        if [ $? -eq 0 ]; then
            print_success "Railway CLI installed successfully"
        else
            print_error "Failed to install Railway CLI"
            exit 1
        fi
    else
        print_success "Railway CLI is installed"
    fi
}

# Login to Railway
railway_login() {
    print_status "Checking Railway login status..."
    # Try to get current project (this will fail if not logged in)
    if ! railway status &> /dev/null; then
        print_warning "Not logged in to Railway"
        print_status "Logging in to Railway..."
        railway login
        if [ $? -ne 0 ]; then
            print_error "Failed to login to Railway"
            exit 1
        fi
    else
        print_success "Already logged in to Railway"
    fi
}

# Link to project
link_project() {
    print_status "Checking project link status..."
    if ! railway status &> /dev/null; then
        print_warning "No Railway project linked"
        print_status "Linking to Railway project..."
        railway link
        if [ $? -ne 0 ]; then
            print_error "Failed to link to Railway project"
            print_status "Make sure you're in the correct directory and have access to the project"
            exit 1
        fi
    else
        print_success "Railway project is linked"
    fi
}

# Get Gemini API key from user
get_api_key() {
    echo ""
    print_status "🔑 Gemini API Key Configuration"
    echo "=================================="
    echo ""
    echo "You need a valid Gemini API key from Google AI Studio."
    echo ""
    echo "📝 To get your API key:"
    echo "   1. Go to: https://makersuite.google.com/app/apikey"
    echo "   2. Sign in with your Google account"
    echo "   3. Click 'Create API key'"
    echo "   4. Copy the API key (it starts with 'AIzaSy...')"
    echo ""
    read -p "Enter your Gemini API key: " GEMINI_API_KEY

    if [ -z "$GEMINI_API_KEY" ]; then
        print_error "No API key provided!"
        exit 1
    fi

    # Basic validation - should start with AIzaSy
    if [[ $GEMINI_API_KEY != AIzaSy* ]]; then
        print_warning "API key doesn't start with 'AIzaSy' - this might be incorrect"
        read -p "Are you sure this is correct? (y/N): " confirm
        if [[ $confirm != [Yy]* ]]; then
            print_error "Please get the correct API key and try again"
            exit 1
        fi
    fi

    print_success "API key received"
}

# Set environment variables
set_environment_variables() {
    print_status "Setting Railway environment variables..."

    # Set the Gemini API key
    print_status "Setting GEMINI_API_KEY..."
    railway variables --set "GEMINI_API_KEY=$GEMINI_API_KEY"
    if [ $? -ne 0 ]; then
        print_error "Failed to set GEMINI_API_KEY"
        exit 1
    fi

    # Set AI provider to Gemini
    print_status "Setting AI_PROVIDER to gemini..."
    railway variables --set "AI_PROVIDER=gemini"

    # Set food analyze provider to Gemini
    print_status "Setting FOOD_ANALYZE_PROVIDER to gemini..."
    railway variables --set "FOOD_ANALYZE_PROVIDER=gemini"

    # Set production configuration
    print_status "Setting production configuration..."
    railway variables --set "NODE_ENV=production"
    railway variables --set "PORT=4000"
    railway variables --set "AI_REQUEST_TIMEOUT=180000"
    railway variables --set "LOG_LEVEL=info"

    # Remove conflicting variables by setting them to empty (Railway doesn't have unset)
    print_status "Removing conflicting variables..."
    railway variables --set "DEEPSEEK_API_KEY=" 2>/dev/null || true
    railway variables --set "DEEPSEEK_API_URL=" 2>/dev/null || true
    railway variables --set "DEEPSEEK_MODEL=" 2>/dev/null || true
    railway variables --set "AI_DEEPSEEK_ONLY=" 2>/dev/null || true
    railway variables --set "CF_ACCOUNT_ID=" 2>/dev/null || true
    railway variables --set "CF_API_TOKEN=" 2>/dev/null || true
    railway variables --set "CF_VISION_MODEL=" 2>/dev/null || true

    print_success "Environment variables configured"
}

# Deploy to Railway
deploy_to_railway() {
    print_status "Deploying to Railway..."
    echo ""
    print_warning "This will trigger a new deployment. It may take 2-3 minutes."
    echo ""

    railway up

    if [ $? -eq 0 ]; then
        print_success "Deployment initiated successfully!"
        echo ""
        print_status "⏱️  Wait 2-3 minutes for the deployment to complete"
        echo ""
        print_status "🌐 Your app will be available at: https://gofitai-production.up.railway.app"
        echo ""
        print_status "🧪 Test commands:"
        echo "   curl -X POST -H \"Content-Type: application/json\" \\"
        echo "        -d '{\"imageDescription\": \"apple\"}' \\"
        echo "        https://gofitai-production.up.railway.app/api/analyze-food"
        echo ""
        echo "   curl -X POST -H \"Content-Type: application/json\" \\"
        echo "        -d '{\"profile\":{\"full_name\":\"Test User\",\"age\":30,\"gender\":\"male\",\"height\":180,\"weight\":80,\"training_level\":\"intermediate\",\"goal_fat_reduction\":2,\"exercise_frequency\":\"4_5\"}}' \\"
        echo "        https://gofitai-production.up.railway.app/api/generate-workout-plan"
    else
        print_error "Deployment failed!"
        print_status "Check Railway logs for more details: railway logs"
        exit 1
    fi
}

# Main execution
main() {
    echo "This script will:"
    echo "  ✅ Check Railway CLI installation"
    echo "  ✅ Login to Railway"
    echo "  ✅ Link to your project"
    echo "  ✅ Configure Gemini API key"
    echo "  ✅ Set environment variables"
    echo "  ✅ Deploy to Railway"
    echo ""

    check_railway_cli
    echo ""

    railway_login
    echo ""

    link_project
    echo ""

    get_api_key
    echo ""

    set_environment_variables
    echo ""

    deploy_to_railway
    echo ""

    print_success "🎉 Setup complete!"
    print_status "Your Railway deployment should now have working Gemini AI!"
    echo ""
    print_status "If you still have issues:"
    print_status "  1. Check Railway logs: railway logs"
    print_status "  2. Test the diagnostic script: railway run node diagnose-railway-gemini.js"
    print_status "  3. Contact support if needed"
}

# Run the main function
main





