# Security Guide

## 🔒 Environment Variables Security

This project has been secured to prevent accidental exposure of API keys and secrets. Follow these guidelines:

### ✅ What We've Secured

1. **Server Environment (`server/.env`)**:
   - Removed hardcoded API keys 
   - Replaced with placeholder values
   - JWT secrets use placeholder values

2. **Test Files**: 
   - All hardcoded HuggingFace tokens replaced with `process.env.RAG_SERVICE_TOKEN`
   - All hardcoded API keys replaced with environment variable references

3. **Example Files**:
   - Updated `.env.example` files with secure placeholder patterns
   - Added security warnings in comments

### 🚨 Required Actions

Before running the application, you MUST set these environment variables:

#### Server Environment Variables

```bash
# Generate secure JWT secret (32+ characters)
export JWT_SECRET=$(openssl rand -base64 32)

# Set your API keys
export DASHSCOPE_API_KEY="sk-your_actual_dashscope_key"
export RAG_SERVICE_TOKEN="hf_your_actual_huggingface_token"
export PINECONE_API_KEY="pcsk_your_actual_pinecone_key"

# Or create server/.env file with real values
cp server/.env.example server/.env
# Then edit server/.env with your actual secrets
```

#### Frontend Environment Variables

```bash
# Generate secure NextAuth secret
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Or create web/.env.local file
cp web/.env.example web/.env.local  
# Then edit web/.env.local with your actual secrets
```

### 📋 Environment Variables Checklist

**Server (`server/.env`):**
- [ ] `JWT_SECRET` - Secure random string (32+ chars)
- [ ] `DASHSCOPE_API_KEY` - Your Qwen API key 
- [ ] `RAG_SERVICE_TOKEN` - HuggingFace token
- [ ] `PINECONE_API_KEY` - Pinecone API key (optional)
- [ ] `CHROMADB_API_KEY` - ChromaDB cloud key (optional)

**Frontend (`web/.env.local`):**
- [ ] `NEXTAUTH_SECRET` - Secure random string (32+ chars)
- [ ] `NEXT_PUBLIC_API_URL` - Backend API URL

### 🔧 Development Setup

1. **Copy example files:**
   ```bash
   cp server/.env.example server/.env
   cp web/.env.example web/.env.local
   ```

2. **Generate secrets:**
   ```bash
   # JWT Secret for server
   openssl rand -base64 32
   
   # NextAuth secret for frontend  
   openssl rand -base64 32
   ```

3. **Fill in your API keys** in the respective `.env` files

4. **Test the setup:**
   ```bash
   # Start server
   cd server && npm start
   
   # Start frontend (in new terminal)
   cd web && npm run dev
   ```

### 🛡️ Security Best Practices

1. **Never commit `.env` files** with real secrets to version control
2. **Use different secrets** for development, staging, and production
3. **Rotate secrets regularly** in production environments
4. **Use environment variable injection** in deployment platforms
5. **Validate environment variables** on application startup

### 🚫 Files to Never Commit

The following files should NEVER contain real secrets and be committed:
- `server/.env` (development secrets)  
- `web/.env.local` (frontend secrets)
- `server/.env.backup` (backup of original secrets)
- Any file ending in `.env` except `.env.example`

### 🔍 Verification

To verify secrets are properly externalized:

```bash
# Check that no hardcoded secrets exist
grep -r "sk-[a-zA-Z0-9]\{32,\}" . --exclude-dir=node_modules
grep -r "hf_[a-zA-Z0-9]\{34,\}" . --exclude-dir=node_modules
grep -r "pcsk_[a-zA-Z0-9_]\{40,\}" . --exclude-dir=node_modules

# Should return no results if properly cleaned
```

### 📞 Support

If you encounter issues:
1. Ensure all environment variables are set
2. Check that `.env` files exist and contain real values
3. Verify secrets are properly formatted (no extra spaces/quotes)
4. Check server logs for specific missing environment variables

---

⚠️ **Remember**: Security is everyone's responsibility. Never share API keys in chat, email, or public forums.