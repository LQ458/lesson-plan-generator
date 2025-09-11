# NextAuth Setup Test Guide

## ✅ What We've Implemented

### 1. Pure NextAuth Flow (Official Recommended)
- **No Express backend dependency** for authentication
- NextAuth connects **directly to MongoDB**
- Uses credentials provider with custom MongoDB validation
- Follows NextAuth.js official documentation patterns

### 2. File Structure
```
web/
├── src/lib/auth.ts         # NextAuth configuration  
├── src/lib/mongodb.ts      # MongoDB connection utility
├── src/models/User.ts      # User model (Mongoose)
├── .env.local             # Environment variables
└── src/app/api/auth/[...nextauth]/route.ts  # NextAuth API routes
```

### 3. Authentication Flow
```
Browser → NextAuth.js → MongoDB (direct)
   ↓
No Express backend calls for auth
```

### 4. Environment Variables (web/.env.local)
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ubzn02rhFuKptIJgS3OeMPPpBvBbaYOtfWp8p0uBiF0=
MONGODB_URI=mongodb://localhost:27017/teachai
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 🧪 Testing Steps

### 1. Start Both Servers
```bash
# Terminal 1: Start Express API server
cd server
node server.js

# Terminal 2: Start Next.js frontend  
cd web
npm run dev
```

### 2. Test Authentication
1. Visit: `http://localhost:3000/login`
2. Try logging in with existing MongoDB user credentials
3. NextAuth should authenticate directly against MongoDB
4. Check browser console for `[NextAuth]` logs

### 3. Verify Routes Work
- `http://localhost:3000/api/auth/signin` ✅ (NextAuth handles)
- `http://localhost:3001/test` ✅ (Express API works) 
- `http://localhost:3001/lesson-plan` ✅ (Express AI endpoints)

## 🔄 Production Deployment

### For Cloud Server:
1. **Update web/.env.local**:
   ```bash
   NEXTAUTH_URL=https://bijielearn.com
   MONGODB_URI=mongodb://your-production-mongodb-uri
   NEXT_PUBLIC_API_URL=https://bijielearn.com/api
   ```

2. **Nginx Configuration**:
   - `/` → Next.js (port 3000) 
   - `/api/auth/*` → Next.js (NextAuth handles)
   - `/api/*` → Express (port 3001) for AI/content APIs

3. **No Express Auth Routes Needed**:
   - Removed all `/auth/*` routes from Express
   - NextAuth handles authentication entirely within Next.js

## ✅ Benefits of This Setup
- **Official NextAuth pattern** - follows documentation exactly
- **No circular dependencies** - auth is self-contained in Next.js
- **Better security** - no backend API calls for sensitive auth operations  
- **Simpler deployment** - clear separation of concerns
- **Production ready** - follows NextAuth.js best practices