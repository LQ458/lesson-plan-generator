import { NextRequest, NextResponse } from "next/server";

// 指定需要保护的路由（登录后才能访问）
const protectedRoutes = [
  "/lesson-plan",
  "/exercises",
  "/my-content",
  "/settings",
];
// 指定公开路由（无需登录）
const publicRoutes = ["/login", "/"];

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

  if (sessionCookie) {
    try {
      // Try to parse the session cookie to validate it's a valid JSON
      const sessionData = JSON.parse(sessionCookie);
      isAuthenticated = Boolean(sessionData && sessionData.userId);
    } catch (error) {
      // If parsing fails, consider as not authenticated
      console.warn('Failed to parse session cookie:', error);
      isAuthenticated = false;
    }
  }

  // Debug logging for production troubleshooting
  console.log('Middleware check:', {
    pathname,
    isProtected,
    isPublic,
    isAuthenticated,
    hasSessionCookie: Boolean(sessionCookie),
  });

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
