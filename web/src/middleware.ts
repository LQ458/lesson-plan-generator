import { NextRequest, NextResponse } from "next/server";

// 指定需要保护的路由（登录后才能访问）
const protectedRoutes = [
  "/lesson-plan",
  "/exercises",
  "/my-content",
  "/settings",
];
// 指定公开路由（无需登录）
const publicRoutes = ["/login", "/", "/debug-auth"];

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

  // 读取 session cookie（仅做乐观检查，避免远程请求）
  const sessionCookie = request.cookies.get("session")?.value;
  let isAuthenticated = false;
  let sessionDebugInfo = null;

  if (sessionCookie) {
    try {
      // URL decode the cookie first (common production issue)
      let decodedCookie = sessionCookie;
      if (sessionCookie.includes('%')) {
        decodedCookie = decodeURIComponent(sessionCookie);
      }
      
      // Try to parse the session cookie to validate it's a valid JSON
      const sessionData = JSON.parse(decodedCookie);
      isAuthenticated = Boolean(sessionData && (sessionData.userId || sessionData.user?.id));
      sessionDebugInfo = {
        hasUserId: Boolean(sessionData?.userId),
        hasUserObject: Boolean(sessionData?.user),
        hasUserIdInObject: Boolean(sessionData?.user?.id),
        keys: sessionData ? Object.keys(sessionData) : [],
        wasUrlEncoded: sessionCookie.includes('%'),
        originalLength: sessionCookie.length,
        decodedLength: decodedCookie.length
      };
    } catch (error) {
      // If parsing fails, try simple existence check (fallback for different cookie formats)
      isAuthenticated = sessionCookie.length > 10 && !sessionCookie.startsWith('deleted');
      sessionDebugInfo = {
        parseError: error instanceof Error ? error.message : 'Parse failed',
        cookieLength: sessionCookie.length,
        fallbackAuth: isAuthenticated,
        cookiePreview: sessionCookie.substring(0, 50)
      };
    }
  }

  // Create production-visible debug info in response headers
  const response = NextResponse.next();
  const debugInfo = {
    timestamp: new Date().toISOString(),
    pathname,
    isProtected,
    isAuthenticated,
    hasSessionCookie: Boolean(sessionCookie),
    sessionCookieLength: sessionCookie?.length || 0,
    decision: isProtected && !isAuthenticated ? 'REDIRECT_TO_LOGIN' : 'ALLOW_ACCESS'
  };
  
  // Add debug headers that are visible in browser dev tools
  response.headers.set('X-Auth-Debug', JSON.stringify(debugInfo));
  response.headers.set('X-Auth-Status', isAuthenticated ? 'authenticated' : 'unauthenticated');
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
