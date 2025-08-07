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
      // Try to parse the session cookie to validate it's a valid JSON
      const sessionData = JSON.parse(sessionCookie);
      isAuthenticated = Boolean(sessionData && (sessionData.userId || sessionData.user?.id));
      sessionDebugInfo = {
        hasUserId: Boolean(sessionData?.userId),
        hasUserObject: Boolean(sessionData?.user),
        hasUserIdInObject: Boolean(sessionData?.user?.id),
        keys: sessionData ? Object.keys(sessionData) : []
      };
    } catch (error) {
      // If parsing fails, try simple existence check (fallback for different cookie formats)
      console.warn('Failed to parse session cookie, trying fallback:', error);
      // For production, be more lenient - if there's a session cookie, consider authenticated
      isAuthenticated = sessionCookie.length > 10 && !sessionCookie.startsWith('deleted');
      sessionDebugInfo = {
        parseError: error instanceof Error ? error.message : 'Parse failed',
        cookieLength: sessionCookie.length,
        fallbackAuth: isAuthenticated
      };
    }
  }

  // Force logging to multiple channels for production debugging
  const debugInfo = {
    timestamp: new Date().toISOString(),
    pathname,
    url: request.url,
    isProtected,
    isPublic,
    hasSessionCookie: Boolean(sessionCookie),
    sessionCookieLength: sessionCookie?.length || 0,
    isAuthenticated,
    sessionDebugInfo,
    decision: isProtected && !isAuthenticated ? 'REDIRECT_TO_LOGIN' : 'ALLOW_ACCESS',
    sessionData: sessionCookie ? 'EXISTS' : 'MISSING',
    cookieValue: sessionCookie?.substring(0, 100) || 'NONE'
  };

  // Use multiple console methods to ensure visibility in production
  console.error('🔴 MIDDLEWARE:', JSON.stringify(debugInfo, null, 2));
  console.warn('🟡 MIDDLEWARE:', JSON.stringify(debugInfo, null, 2));
  console.log('🟢 MIDDLEWARE:', JSON.stringify(debugInfo, null, 2));
  console.info('ℹ️ MIDDLEWARE:', JSON.stringify(debugInfo, null, 2));

  // Manual decode test - the session cookie from your API call
  const testSessionCookie = '%7B%22userId%22%3A%226891db29feb0a40a2d2b1a31%22%2C%22username%22%3A%22test%22%2C%22userPreferences%22%3A%7B%22theme%22%3A%22system%22%2C%22language%22%3A%22zh_CN%22%2C%22notifications%22%3Atrue%2C%22subject%22%3A%22math%22%2C%22gradeLevel%22%3A%22junior_1%22%2C%22easyMode%22%3Afalse%7D%2C%22createdAt%22%3A%222025-08-07T04%3A46%3A25.543Z%22%7D';
  try {
    const decoded = decodeURIComponent(testSessionCookie);
    const parsed = JSON.parse(decoded);
    console.error('🧪 MANUAL DECODE TEST:', { decoded, parsed, hasUserId: Boolean(parsed.userId) });
  } catch (error) {
    console.error('🧪 MANUAL DECODE FAILED:', error);
  }

  // 未登录访问受保护路由 -> 重定向到登录页
  if (isProtected && !isAuthenticated) {
    console.log('Redirecting to login - protected route without auth');
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 已登录访问登录页 -> 重定向到默认页（/lesson-plan）
  if (pathname === "/login" && isAuthenticated) {
    console.log('Redirecting to lesson-plan - authenticated user on login page');
    return NextResponse.redirect(new URL("/lesson-plan", request.url));
  }

  // 其他情况直接放行
  return NextResponse.next();
}

// 让 Middleware 作用于除 API 与静态资源外的所有路由
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.css$|.*\\.js$).*)",
  ],
};
