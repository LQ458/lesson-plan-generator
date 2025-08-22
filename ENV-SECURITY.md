# Environment Variable Security Checklist

## 🔒 Environment Variables Required for ChromaDB Cloud

### **New Variables for Cloud (add these):**
```bash
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=your_chromadb_cloud_api_key        # 🔒 SENSITIVE
CHROMADB_TENANT=your_tenant_id                      # 🔒 SENSITIVE  
CHROMADB_DATABASE=teachai                           # 🌐 Safe to log
CHROMADB_COLLECTION=teachai_main                    # 🌐 Safe to log
```

### **Keep Your Existing Variables:**
```bash
DASHSCOPE_API_KEY=your_qwen_api_key                 # 🔒 SENSITIVE
MONGODB_URI=mongodb://localhost:27017/teachai       # 🔒 SENSITIVE (contains creds)
JWT_SECRET=your_jwt_secret                          # 🔒 SENSITIVE
PORT=3001                                           # 🌐 Safe to log
NODE_ENV=production                                 # 🌐 Safe to log
```

## ✅ Security Status

### **🔒 Protected in Logs (Masked):**
- ✅ `CHROMADB_API_KEY` - Only first 10 chars shown
- ✅ `CHROMADB_TENANT` - Only first 8 chars shown  
- ✅ `DASHSCOPE_API_KEY` - Protected by existing code
- ✅ `JWT_SECRET` - Should not be logged
- ✅ `MONGODB_URI` - Should not be logged

### **🌐 Safe to Log (Non-sensitive):**
- ✅ `CHROMADB_DATABASE` - Database name is not sensitive
- ✅ `CHROMADB_COLLECTION` - Collection name is not sensitive
- ✅ `PORT` - Port number is not sensitive
- ✅ `NODE_ENV` - Environment type is not sensitive

### **🛡️ Logging Protection:**
- ✅ Configuration details only logged in development mode (`NODE_ENV !== 'production'`)
- ✅ Connection logs mask sensitive values
- ✅ Error logs mask sensitive values

## 🔧 How to Set Environment Variables

### **Local Development:**
Create `server/.env`:
```bash
# Copy from server/.env.example
cp server/.env.example server/.env

# Edit with your values
CHROMA_CLOUD_ENABLED=true
CHROMADB_API_KEY=your_actual_api_key
CHROMADB_TENANT=your_actual_tenant_id
CHROMADB_DATABASE=teachai
CHROMADB_COLLECTION=teachai_main
```

### **Production Platforms:**

#### **Vercel:**
```bash
# In Vercel dashboard or CLI
vercel env add CHROMA_CLOUD_ENABLED true
vercel env add CHROMADB_API_KEY your_actual_api_key
vercel env add CHROMADB_TENANT your_actual_tenant_id
vercel env add CHROMADB_DATABASE teachai
```

#### **Heroku:**
```bash
heroku config:set CHROMA_CLOUD_ENABLED=true
heroku config:set CHROMADB_API_KEY=your_actual_api_key
heroku config:set CHROMADB_TENANT=your_actual_tenant_id
heroku config:set CHROMADB_DATABASE=teachai
```

#### **Railway/Render/etc:**
Add in your platform's environment variable dashboard.

## 🔍 Security Best Practices

### **✅ DO:**
- Use environment variables for all sensitive data
- Different values for development/staging/production
- Rotate API keys periodically
- Use strong, unique JWT secrets
- Monitor logs for accidental secret exposure

### **❌ DON'T:**
- Commit secrets to version control (.env files should be in .gitignore)
- Share API keys in chat/email
- Use weak or default secrets
- Log full API keys or tokens
- Reuse secrets across different environments

## 🧪 Test Your Security

Run the security test:
```bash
node test-env-config.js
```

This will:
- ✅ Check all required variables are set
- ✅ Verify sensitive values are masked in logs
- ✅ Test ChromaDB Cloud connection
- ✅ Provide detailed security feedback

## 🚨 If Secrets Are Compromised

1. **Immediately rotate/regenerate:**
   - ChromaDB Cloud API key
   - JWT secret
   - Database passwords

2. **Update all environments:**
   - Development
   - Staging  
   - Production

3. **Check logs for exposure**
4. **Update documentation**
5. **Monitor for unauthorized access**

## 📋 Pre-Deployment Checklist

- [ ] All environment variables set
- [ ] Secrets masked in logs
- [ ] Different secrets for each environment
- [ ] `.env` files in `.gitignore`
- [ ] Test script passes (`node test-env-config.js`)
- [ ] Connection to ChromaDB Cloud successful
- [ ] No secrets committed to git history