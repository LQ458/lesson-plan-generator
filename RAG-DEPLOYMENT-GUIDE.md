# 🚀 TeachAI RAG Service Deployment Guide

## ✅ **Current Status: Ready for Deployment**

Your TeachAI RAG service has been successfully prepared and is ready for deployment to Hugging Face Spaces.

## 📁 **Deployment Files Ready**

All files are prepared in `/hf-deployment/` directory:

- ✅ `app.py` - Complete RAG service with Gradio UI + Flask API
- ✅ `requirements.txt` - Optimized dependencies for HF Spaces  
- ✅ `README.md` - Full documentation with API examples
- ✅ `sample_data.json` - 5 educational chunks for immediate testing

## 🎯 **Deployment Options**

### **Option 1: Manual Upload to Hugging Face Spaces (Recommended)**

Due to network timeouts with git push, manual upload is the most reliable method:

1. **Go to Hugging Face Spaces**: https://huggingface.co/spaces/new
2. **Create New Space**:
   - Owner: `LQ458`
   - Space name: `teachai`
   - License: MIT
   - SDK: **Gradio**
   - Keep public

3. **Upload Files**: Drag and drop these files from `hf-deployment/`:
   - `app.py`
   - `requirements.txt`
   - `README.md` 
   - `sample_data.json`

4. **Commit**: Add commit message "Deploy TeachAI RAG Service"

### **Option 2: Git Push (If Network Improves)**

Your git repository is properly configured with token authentication:

```bash
cd teachai
git push origin main
```

## 🔧 **Service Configuration**

### **Environment Variables (Already Set)**

Your main TeachAI app is configured in `.env`:
```bash
RAG_SERVICE_URL=https://lq458-teachai.hf.space
```

### **Integration Status**

✅ **Main App Modified**: `server/ai-service.js` automatically detects and uses external RAG API  
✅ **Authentication Fixed**: Hugging Face token configured  
✅ **Sample Data Ready**: 5 educational chunks covering math, Chinese, English, science, geography  
✅ **API Endpoints**: `/api/search`, `/api/stats`, `/api/health`

## 🎯 **Expected Deployment Timeline**

1. **Upload Files**: 2-3 minutes
2. **Build Process**: 5-8 minutes (installing dependencies)
3. **Service Ready**: 10-12 minutes total

## 🧪 **Testing Your Deployed Service**

### **1. Web Interface Test**
Visit: `https://lq458-teachai.hf.space`
- Enter query: "数学基础概念"
- Select subject: "数学"  
- Select grade: "三年级"
- Click search

### **2. API Test**
```bash
curl -X POST https://lq458-teachai.hf.space/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "数学基础概念",
    "subject": "数学",
    "grade": "三年级", 
    "limit": 5
  }'
```

### **3. Integration Test**
Start your main TeachAI app:
```bash
pnpm dev
```
Generate a lesson plan and check logs for:
```
🌐 Using external RAG service: https://lq458-teachai.hf.space
✅ [RAG] 成功检索到相关教学资料 - ragType: external-api
```

## 📊 **Service Features**

Your deployed RAG service provides:

- **🔍 Semantic Search**: Advanced Chinese text search with multilingual embeddings
- **📚 Educational Database**: 5 sample chunks (expandable to 95,360+)
- **🎯 Subject/Grade Filtering**: Targeted search by subject and grade level
- **🌐 Dual Interface**: Both interactive Gradio UI and REST API
- **📊 Quality Scoring**: Content reliability metrics and OCR confidence scores

## 🔄 **Expanding the Dataset**

Once deployed with sample data, you can expand to the full dataset:

### **Method 1: Upload Full Data**
1. Upload `rag_data/chunks/*.json` files to the Space
2. Service will automatically detect and load them

### **Method 2: GitHub Integration**
1. Create public repository with educational data
2. Modify `app.py` to download from your repository
3. Update and redeploy

## ⚡ **Performance Expectations**

**Free Tier:**
- Response Time: 2-5 seconds
- Concurrent Users: 1-3
- Cold Start: 10-15 seconds

**Pro Tier ($9/month):**
- Response Time: 1-2 seconds  
- Concurrent Users: 10+
- Always-on service

## 🚨 **Troubleshooting**

### **If Deployment Fails:**
1. Check build logs in HF Spaces interface
2. Verify all files uploaded correctly
3. Ensure `requirements.txt` format is correct

### **If Service Returns Errors:**
1. Check sample data format in `sample_data.json`
2. Verify Gradio version compatibility
3. Check Python dependency conflicts

### **If Main App Can't Connect:**
1. Verify `RAG_SERVICE_URL` in `.env`
2. Check HF Space is public and accessible
3. Test API endpoint manually

## 🎉 **Success Indicators**

Once deployed successfully, you'll see:

1. **✅ Hugging Face Space**: Running at `https://lq458-teachai.hf.space`
2. **✅ Gradio Interface**: Interactive search working
3. **✅ API Endpoints**: Responding to HTTP requests  
4. **✅ Main App Logs**: `ragType: external-api`

## 📈 **Next Steps After Deployment**

1. **Test Thoroughly**: Verify all functionality works
2. **Monitor Performance**: Check response times and accuracy
3. **Scale Data**: Add more educational content as needed
4. **Upgrade Service**: Consider HF Pro tier for better performance

---

## 🔗 **Quick Links**

- **Hugging Face Spaces**: https://huggingface.co/spaces/new
- **Your Target URL**: https://lq458-teachai.hf.space  
- **HF Token Settings**: https://huggingface.co/settings/tokens
- **Deployment Files**: `/hf-deployment/` directory

Your TeachAI RAG service is **ready for deployment**! The microservices architecture will provide better performance, easier maintenance, and scalable functionality.