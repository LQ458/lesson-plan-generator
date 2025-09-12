# Simple Nginx Configuration Fix

## ✅ **Backend Routes Changed to `/server/`**

I've updated all Express backend routes to use `/server/` prefix instead of `/api/` to completely avoid conflicts with NextAuth's `/api/auth/` routes.

## **Route Changes Made:**

### Express Backend (Port 3001) - Now uses `/server/` prefix:
- `/server/health` - Health check
- `/server/status` - Server status  
- `/server/lesson-plan` - AI lesson plan generation
- `/server/exercises` - AI exercise generation
- `/server/analyze` - AI content analysis
- `/server/content/*` - Content management APIs
- `/server/export/*` - Export functionality
- `/server/admin/*` - Admin APIs
- `/server/rag/*` - RAG system APIs

### Next.js Frontend (Port 3000) - Uses `/api/` prefix:
- `/api/auth/*` - NextAuth.js authentication (no conflicts!)
- All other pages and Next.js API routes

## **Updated Nginx Configuration:**

```nginx
# Simple configuration - route by prefix
server {
    listen 80;
    server_name bijielearn.com;

    # Express backend routes (port 3001)
    location /server/ {
        proxy_pass http://localhost:3001/server/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Everything else goes to Next.js frontend (port 3000)
    # This includes /api/auth/* for NextAuth.js
    location / {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## **Benefits of This Approach:**
1. **No conflicts** - `/server/` vs `/api/` are completely separate
2. **Simple routing** - Only 2 rules needed instead of complex regex
3. **Clear separation** - Easy to understand which service handles what
4. **Future-proof** - Adding new routes is straightforward

## **Testing the Changes:**

### Test NextAuth (should work now):
```bash
curl -I https://bijielearn.com/api/auth/session  # → Next.js (port 3000)
curl -I https://bijielearn.com/api/auth/providers # → Next.js (port 3000)
```

### Test Express backend:
```bash
curl -I https://bijielearn.com/server/health    # → Express (port 3001)
curl -I https://bijielearn.com/server/status    # → Express (port 3001)
```

### Test frontend:
```bash
curl -I https://bijielearn.com/                 # → Next.js (port 3000)  
curl -I https://bijielearn.com/login            # → Next.js (port 3000)
```

## **Environment Variables:**
Make sure these are set for NextAuth:

```bash
# Next.js environment
NEXTAUTH_URL=https://bijielearn.com
NEXTAUTH_SECRET=your_secret_key_here
MONGODB_URI=mongodb://localhost:27017/teachai
```

## **Deploy Steps:**
1. **Pull/deploy the updated code** with new `/server/` routes
2. **Update nginx configuration** with the simple 2-rule setup above  
3. **Restart services**: `sudo systemctl reload nginx`
4. **Test**: All authentication should work without 502 errors!

The login page is ready and will work perfectly once nginx routes are updated! 🚀