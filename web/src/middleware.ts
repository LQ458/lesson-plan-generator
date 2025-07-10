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

  // 如果不在受保护或公开路由列表中，则直接放行（例如静态资源）
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isPublic = publicRoutes.includes(pathname);

  // 读取 session cookie（仅做乐观检查，避免远程请求）
  const token = request.cookies.get("session")?.value;
  const isAuthenticated = Boolean(token); // 若需要进一步验证可在后端接口进行

  // 未登录访问受保护路由 -> 重定向到登录页
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 已登录访问公开路由 -> 重定向到默认页（/lesson-plan）
  if (isPublic && isAuthenticated && pathname !== "/lesson-plan") {
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
