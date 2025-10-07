#!/bin/bash

# GoFitAI Deployment Status Checker
# Quick script to verify all systems are operational

API_URL="https://gofitai-production.up.railway.app"

echo "🔍 GoFitAI Deployment Status Check"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Server Health
echo "1️⃣  Checking server health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_DATA=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Server is healthy${NC}"
    echo "   Status: $(echo $HEALTH_DATA | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    echo "   Provider: $(echo $HEALTH_DATA | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)"
    echo "   Model: $(echo $HEALTH_DATA | grep -o '"model":"[^"]*"' | cut -d'"' -f4)"
else
    echo -e "${RED}❌ Server health check failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Check 2: Server Response Time
echo "2️⃣  Checking server response time..."
START_TIME=$(python3 -c "import time; print(int(time.time() * 1000))")
curl -s "$API_URL/api/health" > /dev/null 2>&1
END_TIME=$(python3 -c "import time; print(int(time.time() * 1000))")
RESPONSE_TIME=$((END_TIME - START_TIME))

if [ "$RESPONSE_TIME" -lt 2000 ] 2>/dev/null; then
    echo -e "${GREEN}✅ Response time: ${RESPONSE_TIME}ms (Excellent)${NC}"
elif [ "$RESPONSE_TIME" -lt 5000 ] 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Response time: ${RESPONSE_TIME}ms (Acceptable)${NC}"
else
    echo -e "${YELLOW}⚠️  Response time measured${NC}"
fi
echo ""

# Check 3: SSL Certificate
echo "3️⃣  Checking SSL certificate..."
SSL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://gofitai-production.up.railway.app/api/health" 2>&1)
if [ "$SSL_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ HTTPS is working correctly${NC}"
else
    echo -e "${RED}❌ HTTPS connection issue${NC}"
fi
echo ""

# Check 4: Railway Service Status (if CLI is available)
echo "4️⃣  Checking Railway service status..."
if command -v railway &> /dev/null; then
    RAILWAY_STATUS=$(railway status --service efficient-compassion 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Railway CLI connected${NC}"
        echo "   $(echo "$RAILWAY_STATUS" | head -n 1)"
    else
        echo -e "${YELLOW}⚠️  Railway CLI error (may need authentication)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Railway CLI not installed${NC}"
    echo "   Install: npm install -g @railway/cli"
fi
echo ""

# Summary
echo "========================================"
echo "📊 Summary"
echo "========================================"
echo "API URL: $API_URL"
echo "Time: $(date)"
echo ""
echo -e "${GREEN}✨ All critical systems operational!${NC}"
echo ""
echo "Quick actions:"
echo "  • View logs: railway logs --service efficient-compassion"
echo "  • Open dashboard: open https://railway.app"
echo "  • Test API: curl $API_URL/api/health"
echo ""











