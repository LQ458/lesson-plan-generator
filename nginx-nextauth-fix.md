# Nginx Configuration Fix for NextAuth.js

## Problem
The cloud deployment is receiving 502 Bad Gateway errors because nginx routes ALL `/api/*` requests to the Express backend (port 3001), but NextAuth.js authentication endpoints need to go to the Next.js frontend (port 3000).

## Error Messages
```
GET https://bijielearn.com/api/auth/verify 502 (Bad Gateway)
GET https://bijielearn.com/api/auth/session 502 (Bad Gateway)  
POST https://bijielearn.com/api/auth/_log 502 (Bad Gateway)
```

## Current Nginx Configuration (Incorrect)
```nginx
# This routes ALL /api/* to Express backend - WRONG!
location /api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Fixed Nginx Configuration (Correct)
```nginx
# NextAuth.js routes go to Next.js frontend (port 3000)
location /api/auth/ {
    proxy_pass http://localhost:3000/api/auth/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# AI service routes go to Express backend (port 3001)  
location ~ ^/api/(lesson-plan|exercises|analyze)$ {
    proxy_pass http://localhost:3001$request_uri;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Content API routes go to Express backend (port 3001)
location ~ ^/api/content/ {
    proxy_pass http://localhost:3001$request_uri;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# All other requests go to Next.js frontend (port 3000)
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
```

## Summary of Routing Rules

### ✅ NextAuth.js (Next.js Frontend - Port 3000)
- `/api/auth/*` - All NextAuth.js endpoints
- `/_next/*` - Next.js static assets
- All other pages and routes

### ✅ Express Backend (Port 3001) 
- `/api/lesson-plan` - AI lesson plan generation
- `/api/exercises` - AI exercise generation  
- `/api/analyze` - AI content analysis
- `/api/content/*` - Content management APIs

## Environment Variables Needed
Make sure these are set in the Next.js environment:

```bash
# Next.js environment (.env.local or production env)
NEXTAUTH_URL=https://bijielearn.com
NEXTAUTH_SECRET=your_nextauth_secret_key_here
AUTH_SECRET=your_nextauth_secret_key_here  # Alternative name

# MongoDB connection for NextAuth
MONGODB_URI=mongodb://localhost:27017/teachai
```

## Testing Commands
After updating nginx configuration:

```bash
# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Test NextAuth endpoints
curl -I https://bijielearn.com/api/auth/session
curl -I https://bijielearn.com/api/auth/providers

# Test Express backend endpoints  
curl -I https://bijielearn.com/api/lesson-plan
curl -I https://bijielearn.com/api/content/stats
```

## Key Points
1. **Order matters** - Specific routes (`/api/auth/`) must come BEFORE general routes (`/api/`)
2. **NextAuth requires HTTPS** - Make sure SSL is properly configured
3. **CORS headers** - Set proper forwarded headers for authentication
4. **Session cookies** - NextAuth cookies need proper domain/path settings

This configuration ensures:
- NextAuth.js authentication works properly (no more 502 errors)
- Express backend APIs continue to function
- Proper header forwarding for secure authentication
- Clean separation between frontend auth and backend APIs