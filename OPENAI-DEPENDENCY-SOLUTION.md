# OpenAI Dependency Solution for Zeabur Deployment

## Problem
Zeabur deployment failing with error:
```
Error: Cannot find module 'openai'
Require stack:
- /app/server/ai-service.js
- /app/server/server.js
```

## Root Cause
The `ai-service.js` file requires the `openai` package with:
```javascript
const OpenAI = require("openai");
```

But the `openai` package was not in the `server/package.json` dependencies.

## Solution Applied

### 1. Added OpenAI Dependency
Updated `server/package.json` to include:
```json
{
  "dependencies": {
    "openai": "^4.67.3"
  }
}
```

### 2. Created Dependency Check Scripts

#### `server/check-deps.js`
Verifies critical dependencies are available:
```javascript
const dependencies = ['express', 'openai', 'winston', 'mongoose'];
// Checks each dependency and reports status
```

#### `server/install-missing-deps.js`
Automatically installs missing dependencies:
```javascript
// Detects missing packages and runs: pnpm add [missing-packages]
```

### 3. Updated Build Commands
All Zeabur deployment configurations now use:
```bash
pnpm install --frozen-lockfile && node install-missing-deps.js && node check-deps.js
```

This ensures:
1. Normal dependency installation
2. Detection and installation of any missing critical dependencies
3. Verification that all dependencies are available before server starts

## Files Modified

### Core Dependency Files
- `server/package.json` - Added `"openai": "^4.67.3"`

### Deployment Configuration Files
- `ZEABUR-AI-GUIDE.md` - Updated build command
- `zeabur-deployment-instructions.yaml` - Updated build command
- `zeabur-ai-commands.sh` - Updated build command

### New Helper Scripts
- `server/check-deps.js` - Dependency verification
- `server/install-missing-deps.js` - Auto-installation of missing deps

## How It Works

### Build Process Flow
1. **`pnpm install --frozen-lockfile`** - Install packages from package.json
2. **`node install-missing-deps.js`** - Check for and install any missing critical packages
3. **`node check-deps.js`** - Verify all dependencies are available
4. **`node server.js`** - Start the server (only if all deps are OK)

### Dependency Safety Net
The `install-missing-deps.js` script acts as a safety net:
- If `openai` package is missing, it automatically installs it
- Prevents deployment failures due to missing dependencies
- Provides clear logging of what's being installed

## Expected Results

### Before Fix
```
❌ Zeabur deployment fails
❌ Error: Cannot find module 'openai'
❌ Server won't start
```

### After Fix
```
✅ pnpm install completes successfully
✅ Missing dependencies detected and installed
✅ All dependency checks pass
✅ Server starts successfully
✅ AI service works with OpenAI-compatible Qwen API
```

## Verification Steps

### Local Testing
```bash
cd server
node check-deps.js
# Should output: 🎉 All dependencies are available
```

### Zeabur Deployment
1. Deploy with updated build command
2. Check build logs for:
   - `✅ openai - Already installed` or `📦 Installing missing packages: openai`
   - `🎉 All dependencies are available`
3. Verify server starts without module errors

## AI Service Functionality
The AI service continues to work exactly as before:
- Uses OpenAI-compatible interface to connect to Qwen API
- Maintains all existing functionality (lesson plans, exercises, analysis)
- No changes to API endpoints or response formats
- Full RAG system integration preserved

## Deployment Commands

### Updated Zeabur Build Command
```bash
pnpm install --frozen-lockfile && node install-missing-deps.js && node check-deps.js
```

### Manual Dependency Install (if needed)
```bash
cd server
pnpm add openai
```

## Troubleshooting

### If Build Still Fails
1. Check if repository changes are pushed to GitHub
2. Clear Zeabur build cache and redeploy
3. Verify the build command includes all three steps
4. Check build logs for specific error messages

### If Server Starts But AI Fails
1. Verify `DASHSCOPE_API_KEY` environment variable is set
2. Check that Qwen API has sufficient quota
3. Review server logs for AI service initialization messages

## Success Criteria
✅ Build command executes without errors  
✅ All dependency checks pass  
✅ Server starts successfully  
✅ AI service initializes properly  
✅ Lesson plan generation works  
✅ Exercise generation works  
✅ Content analysis works  

This solution ensures reliable Zeabur deployment while maintaining full AI functionality.