# Authentication Debug & Testing Guide

## 🔍 **How to Debug Authentication Issues in Production**

Since Next.js middleware logs aren't visible in production, use these methods:

### Method 1: Check Response Headers
1. Visit any protected route (e.g., `/lesson-plan`)
2. Open Browser Dev Tools → Network tab
3. Look at the response headers for any request
4. Check these debug headers:
   - `X-Auth-Status`: `authenticated` or `unauthenticated`
   - `X-Cookie-Present`: `yes` or `no`
   - `X-Auth-Debug`: JSON with detailed info

### Method 2: Check Cookies Directly
1. Open Dev Tools → Application → Cookies
2. Look under `https://bijielearn.com`
3. Find the `session` cookie and verify:
   - **Domain**: Must be `.bijielearn.com` (with dot!)
   - **Value**: Should be JSON-like data (may be URL-encoded)
   - **HttpOnly**: ✓
   - **Secure**: ✓

### Method 3: API Verification
Visit: `https://api.bijielearn.com/api/auth/verify`
- Should return 200 OK with user data if authenticated
- Should return 401/403 if not authenticated

## ⚠️ **Current Issue Diagnosis**

Based on your description, here's what's happening:

1. **API verification works** (200 OK) ✅
2. **Middleware authentication fails** (can't access protected routes) ❌
3. **Session persists after logout** ❌

This is a **classic cookie domain configuration issue**.

## 🔧 **Step-by-Step Fix Process**

### Step 1: Apply Backend Cookie Fixes
Follow the instructions in `BACKEND-COOKIE-FIX.md`:
1. Update login route cookie configuration
2. Update logout route cookie clearing
3. Set environment variables
4. Redeploy backend

### Step 2: Clear Browser State
1. Open Dev Tools → Application → Storage
2. Click "Clear storage" OR manually delete all cookies for both domains:
   - `https://bijielearn.com`
   - `https://api.bijielearn.com`

### Step 3: Test Authentication Flow
1. Visit `https://bijielearn.com/login`
2. Login with valid credentials
3. Check cookie is set correctly (Method 2 above)
4. Try accessing `/lesson-plan` - should work now
5. Test logout - cookie should be completely removed

### Step 4: Verify Middleware Headers
1. After login, visit any protected route
2. Check `X-Auth-Status` header should be `authenticated`
3. Check `X-Cookie-Present` header should be `yes`

## 🐛 **Common Issues & Solutions**

### Issue: "Still can't access protected routes after login"
**Solution**: Check cookie domain in browser - must be `.bijielearn.com` with the dot

### Issue: "Session persists after logout"
**Solution**: Backend logout route must use identical cookie options as login

### Issue: "No debug headers visible"
**Solution**: Make sure you're checking response headers, not request headers

## 📊 **Testing Checklist**

- [ ] Backend cookie domain set to `.bijielearn.com`
- [ ] Environment variables configured in Zeabur
- [ ] Backend redeployed with new cookie settings
- [ ] Browser cookies cleared completely
- [ ] Login creates cookie with correct domain
- [ ] Protected routes accessible after login
- [ ] Logout completely removes cookie
- [ ] Debug headers show `authenticated` when logged in

## 🚨 **If Still Not Working**

1. Check the response headers on ANY request to see middleware debug info
2. Verify the cookie domain in browser dev tools
3. Test the direct API endpoint: `https://api.bijielearn.com/api/auth/verify`
4. Ensure you've cleared ALL browser data for both domains

The cookie domain issue is the #1 cause of this exact problem in production Next.js deployments.