# 🚨 登录后无法访问功能页面 - 故障排除指南

## 问题症状
- ✅ 登录成功，显示用户名
- ✅ 导航栏显示正确的功能链接  
- ❌ 点击功能链接后无法进入页面
- ❌ 可能出现重定向到登录页面

## 根本原因
**Cookie域名配置错误** - 后端设置的session cookie无法被前端正确读取

## 立即检查清单

### 1. 检查Zeabur后端环境变量
确保以下环境变量已正确设置：

```env
# 🔥 关键配置 - 必须设置
COOKIE_DOMAIN=.bijielearn.com
NODE_ENV=production

# CORS配置
ALLOWED_ORIGINS=https://bijielearn.com,https://www.bijielearn.com,https://api.bijielearn.com

# 认证配置
JWT_SECRET=your_secure_jwt_secret_here
INVITE_CODE=TEACHER2024

# AI服务配置
DASHSCOPE_API_KEY=your_qwen_api_key_here
```

### 2. 检查前端环境变量
确保前端正确配置：

```env
# 前端 .env
NEXT_PUBLIC_API_URL=https://api.bijielearn.com
```

### 3. 验证Cookie状态
访问调试页面检查cookie状态：
```
https://bijielearn.com/debug-auth
```

## 详细诊断步骤

### 步骤1: 检查后端Cookie设置
1. 访问：`https://api.bijielearn.com/api/auth/debug-session`
2. 检查返回结果：
```json
{
  "success": true,
  "debug": {
    "hasSessionCookie": true,  // 应该是 true
    "environment": {
      "nodeEnv": "production",
      "cookieDomain": ".bijielearn.com"  // 🔥 关键：必须是 .bijielearn.com
    }
  }
}
```

### 步骤2: 检查浏览器Cookie
1. 打开浏览器开发者工具
2. 转到 Application → Cookies
3. 检查 `https://bijielearn.com` 下的cookies
4. 应该看到：
   - Name: `session`
   - Domain: `.bijielearn.com` (注意前面的点)
   - HttpOnly: ✓
   - Secure: ✓

### 步骤3: 检查中间件日志
1. 打开浏览器控制台
2. 尝试访问 `/lesson-plan`
3. 查看控制台中的中间件日志：
```
Middleware check: {
  pathname: "/lesson-plan",
  isProtected: true,
  isPublic: false,
  isAuthenticated: true,  // 🔥 关键：应该是 true
  hasSessionCookie: true,
  cookieContent: "EXISTS"
}
```

## 修复方案

### 方案1: 重新设置环境变量
1. 在Zeabur后端服务中，确保设置：
   ```
   COOKIE_DOMAIN=.bijielearn.com
   NODE_ENV=production
   ```
2. 重新部署后端服务
3. 清除浏览器所有cookie
4. 重新登录测试

### 方案2: 验证部署状态
1. 检查后端日志，确认cookie设置信息：
   ```
   Setting login session cookie with options: {
     domain: ".bijielearn.com",  // 🔥 关键
     secure: true,
     sameSite: "lax"
   }
   ```

### 方案3: 临时调试方案
如果仍然有问题，可以临时禁用受保护路由：

1. 编辑 `web/src/middleware.ts`
2. 临时注释掉重定向逻辑：
```javascript
// 未登录访问受保护路由 -> 重定向到登录页
if (isProtected && !isAuthenticated) {
  console.log('Redirecting to login - protected route without auth');
  // return NextResponse.redirect(new URL("/login", request.url));  // 临时注释
}
```

## 常见错误

### ❌ 错误1: Cookie域名缺失
```json
// 错误的环境变量配置
{
  "cookieDomain": null  // 或者未设置
}
```
**解决**: 设置 `COOKIE_DOMAIN=.bijielearn.com`

### ❌ 错误2: Cookie域名错误
```json
// 错误的域名配置
{
  "cookieDomain": "api.bijielearn.com"  // 错误：只能被api子域访问
}
```
**解决**: 改为 `COOKIE_DOMAIN=.bijielearn.com`

### ❌ 错误3: 环境变量未生效
后端日志显示：
```
Setting login session cookie with options: {
  domain: undefined  // 环境变量未生效
}
```
**解决**: 重新部署后端服务，确保环境变量正确加载

## 验证修复成功

修复后，应该看到：

1. **浏览器Cookie** (Domain: `.bijielearn.com`)
2. **后端日志** 显示正确的cookie domain
3. **中间件日志** 显示 `isAuthenticated: true`
4. **功能页面** 可以正常访问

## 联系支持

如果按照上述步骤仍然无法解决，请提供：
1. Zeabur后端环境变量截图
2. `/debug-auth` 页面的完整信息
3. 浏览器控制台的中间件日志
4. 浏览器开发者工具中的Cookie信息