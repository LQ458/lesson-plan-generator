#!/bin/bash

echo "🔍 Testing Nginx Routing Configuration"
echo "======================================="

DOMAIN="bijielearn.com"

echo ""
echo "1. Testing NextAuth.js endpoints (should route to Next.js port 3000):"
echo "----------------------------------------------------------------------"

echo "Testing /api/auth/session..."
curl -I "https://$DOMAIN/api/auth/session" 2>/dev/null | head -5

echo ""
echo "Testing /api/auth/providers..."
curl -I "https://$DOMAIN/api/auth/providers" 2>/dev/null | head -5

echo ""
echo "Testing /api/auth/csrf..."  
curl -I "https://$DOMAIN/api/auth/csrf" 2>/dev/null | head -5

echo ""
echo "2. Testing Express backend endpoints (should route to Express port 3001):"
echo "-------------------------------------------------------------------------"

echo "Testing /server/lesson-plan..."
curl -I "https://$DOMAIN/server/lesson-plan" 2>/dev/null | head -5

echo ""
echo "Testing /server/content/stats..."
curl -I "https://$DOMAIN/server/content/stats" 2>/dev/null | head -5

echo ""
echo "Testing /server/exercises..."
curl -I "https://$DOMAIN/server/exercises" 2>/dev/null | head -5

echo ""
echo "Testing /server/health..."
curl -I "https://$DOMAIN/server/health" 2>/dev/null | head -5

echo ""
echo "3. Testing frontend pages (should route to Next.js port 3000):"
echo "---------------------------------------------------------------"

echo "Testing main page..."
curl -I "https://$DOMAIN/" 2>/dev/null | head -5

echo ""
echo "Testing /login page..."
curl -I "https://$DOMAIN/login" 2>/dev/null | head -5

echo ""
echo "Testing /lesson-plan page..."
curl -I "https://$DOMAIN/lesson-plan" 2>/dev/null | head -5

echo ""
echo "4. Expected Results:"
echo "--------------------"
echo "✅ NextAuth endpoints (/api/auth/*): Should return 200 or 405 (not 502)"
echo "✅ Express endpoints (/server/*): Should return 200, 401, or 404 (not 502)"
echo "✅ Frontend pages (/, /login): Should return 200 (not 502)"
echo ""
echo "❌ 502 Bad Gateway = Nginx routing is incorrect"
echo "❌ Connection refused = Service not running on expected port"

echo ""
echo "🔧 If you see 502 errors, update nginx configuration using nginx-nextauth-fix.md"