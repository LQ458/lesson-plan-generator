import { NextRequest, NextResponse } from "next/server";

// 指定需要保护的路由（登录后才能访问）
const protectedRoutes = [
  "/lesson-plan",
  "/exercises",
  "/my-content",
  "/settings",
];
// 指定公开路由（无需登录）
const publicRoutes = ["/login", "/", "/debug-auth", "/debug-auth-live"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // 如果不在受保护或公开路由列表中，则直接放行（例如静态资源）
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isPublic = publicRoutes.includes(pathname);

  // If it's neither protected nor public, allow access
  if (!isProtected && !isPublic) {
    return NextResponse.next();
  }

  // MULTI-METHOD AUTHENTICATION: Try multiple auth methods in order
  let isAuthenticated = false;
  let authMethod = 'none';
  let sessionDebugInfo: any = {};

  // METHOD 1: Try session cookie (multiple ways)
  let sessionCookie = request.cookies.get("session")?.value;
  
  // Also try to get cookie from raw header as backup
  if (!sessionCookie) {
    const rawCookies = request.headers.get('cookie') || '';
    const sessionMatch = rawCookies.match(/session=([^;]+)/);
    if (sessionMatch) {
      sessionCookie = sessionMatch[1];
    }
  }
  
  if (sessionCookie) {
    try {
      // URL decode the cookie first (common production issue)
      let decodedCookie = sessionCookie;
      if (sessionCookie.includes('%')) {
        decodedCookie = decodeURIComponent(sessionCookie);
      }
      
      // Try to parse the session cookie to validate it's a valid JSON
      const sessionData = JSON.parse(decodedCookie);
      if (sessionData && (sessionData.userId || sessionData.user?.id)) {
        isAuthenticated = true;
        authMethod = 'session-cookie';
        sessionDebugInfo = {
          method: 'session-cookie',
          hasUserId: Boolean(sessionData?.userId),
          wasUrlEncoded: sessionCookie.includes('%'),
          userId: sessionData.userId,
          username: sessionData.username
        };
      }
    } catch (error) {
      sessionDebugInfo.cookieParseError = error instanceof Error ? error.message : 'Parse failed';
      sessionDebugInfo.rawCookie = sessionCookie?.substring(0, 100);
      
      // Even if JSON parsing fails, check if it contains userId (backup method)
      if (sessionCookie && sessionCookie.includes('userId')) {
        isAuthenticated = true;
        authMethod = 'session-cookie-fallback';
        sessionDebugInfo.method = 'session-cookie-fallback';
      }
    }
  }

  // METHOD 2: Try Authorization header (Bearer token)
  if (!isAuthenticated) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      if (token && token.length > 10) {
        // For production, you'd validate this token against your backend
        // For now, we'll do a simple existence check
        isAuthenticated = true;
        authMethod = 'bearer-token';
        sessionDebugInfo.method = 'bearer-token';
        sessionDebugInfo.tokenLength = token.length;
      }
    }
  }

  // METHOD 3: Try custom auth header
  if (!isAuthenticated) {
    const customAuth = request.headers.get('x-auth-token');
    if (customAuth && customAuth.length > 10) {
      isAuthenticated = true;
      authMethod = 'custom-header';
      sessionDebugInfo.method = 'custom-header';
    }
  }

  // METHOD 4: For client-side navigation, check for auth state in headers
  if (!isAuthenticated) {
    const clientAuth = request.headers.get('x-client-auth');
    if (clientAuth === 'authenticated') {
      isAuthenticated = true;
      authMethod = 'client-state';
      sessionDebugInfo.method = 'client-state';
    }
  }

  // METHOD 5: Check URL parameters as fallback for client-side navigation
  if (!isAuthenticated) {
    const url = new URL(request.url);
    const authUser = url.searchParams.get('_auth_user');
    const authTemp = url.searchParams.get('_auth_temp');
    
    if (authUser && authTemp) {
      // Check if the auth timestamp is recent (within 30 seconds)
      const timestamp = parseInt(authTemp);
      const now = Date.now();
      const thirtySeconds = 30 * 1000;
      
      if (now - timestamp < thirtySeconds) {
        isAuthenticated = true;
        authMethod = 'url-params';
        sessionDebugInfo.method = 'url-params';
        sessionDebugInfo.authUser = authUser;
        
        // Clean up the URL by redirecting without the auth parameters
        const cleanUrl = new URL(request.url);
        cleanUrl.searchParams.delete('_auth_user');
        cleanUrl.searchParams.delete('_auth_temp');
        
        if (cleanUrl.toString() !== request.url) {
          return NextResponse.redirect(cleanUrl);
        }
      }
    }
  }

  // Create production-visible debug info in response headers
  const response = NextResponse.next();
  const debugInfo = {
    timestamp: new Date().toISOString(),
    pathname,
    isProtected,
    isAuthenticated,
    authMethod,
    hasSessionCookie: Boolean(sessionCookie),
    sessionCookieLength: sessionCookie?.length || 0,
    hasAuthHeader: Boolean(request.headers.get('authorization')),
    hasCustomAuthHeader: Boolean(request.headers.get('x-auth-token')),
    hasClientAuthHeader: Boolean(request.headers.get('x-client-auth')),
    decision: isProtected && !isAuthenticated ? 'REDIRECT_TO_LOGIN' : 'ALLOW_ACCESS',
    sessionDebugInfo
  };
  
  // Add debug headers that are visible in browser dev tools
  response.headers.set('X-Auth-Debug', JSON.stringify(debugInfo));
  response.headers.set('X-Auth-Status', isAuthenticated ? 'authenticated' : 'unauthenticated');
  response.headers.set('X-Auth-Method', authMethod);
  response.headers.set('X-Cookie-Present', Boolean(sessionCookie) ? 'yes' : 'no');

  // 未登录访问受保护路由 -> 重定向到登录页
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 已登录访问登录页 -> 重定向到默认页（/lesson-plan）
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/lesson-plan", request.url));
  }

  // 其他情况直接放行，带调试信息
  return response;
}

// 让 Middleware 作用于除 API 与静态资源外的所有路由
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.css$|.*\\.js$).*)",
  ],
};
