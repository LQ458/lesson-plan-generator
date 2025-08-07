# Backend Cookie Configuration Fix

## Problem
Your backend (`api.bijielearn.com`) is setting cookies without the correct domain attribute, making them inaccessible to your frontend (`bijielearn.com`).

## Required Backend Changes

### 1. Update Cookie Configuration in ALL Auth Routes

#### Login Route (`/api/auth/login`)
```javascript
// Current (wrong)
res.cookie('session', sessionData, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});

// Fixed (correct)
res.cookie('session', sessionData, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.bijielearn.com' : 'localhost', // KEY FIX
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

#### Logout Route (`/api/auth/logout`)
```javascript
// Current (wrong) - doesn't clear properly
res.clearCookie('session');

// Fixed (correct) - must match exact domain/path settings
res.clearCookie('session', {
  domain: process.env.NODE_ENV === 'production' ? '.bijielearn.com' : 'localhost',
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});
```

### 2. Environment Variables Required
Add to your Zeabur backend service:

```env
NODE_ENV=production
COOKIE_DOMAIN=.bijielearn.com
FRONTEND_URL=https://bijielearn.com
```

### 3. CORS Configuration
Ensure your backend CORS is configured correctly:

```javascript
app.use(cors({
  origin: [
    'https://bijielearn.com',
    'https://www.bijielearn.com'
  ],
  credentials: true, // ESSENTIAL for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Testing Steps

### 1. Check Cookie in Browser
After login, go to Dev Tools → Application → Cookies → `https://bijielearn.com`
You should see:
- **Name**: `session`
- **Domain**: `.bijielearn.com` (with the dot!)
- **Path**: `/`
- **HttpOnly**: ✓
- **Secure**: ✓

### 2. Check Middleware Debug Headers
Visit any protected route and check Network → Response Headers:
- `X-Auth-Status`: should be `authenticated`
- `X-Cookie-Present`: should be `yes`
- `X-Auth-Debug`: JSON with authentication details

### 3. Test Logout
After logout, the session cookie should be completely removed from browser cookies.

## Quick Fix Commands

If you have access to your backend code, make these changes in this order:

1. **Login route**: Add `domain: '.bijielearn.com'` to cookie options
2. **Logout route**: Add same domain options to `clearCookie()`
3. **Set environment variable**: `COOKIE_DOMAIN=.bijielearn.com`
4. **Redeploy backend**
5. **Clear browser cookies completely**
6. **Test login again**

The dot before the domain (`.bijielearn.com`) is CRITICAL - it allows the cookie to be shared between subdomains.