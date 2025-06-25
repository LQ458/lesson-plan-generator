import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

// 公开路由（无需登录）
const publicRoutes = ["/login"];

// API路由（跳过认证检查）
const apiRoutes = ["/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过API认证路由
  if (apiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 检查是否为公开路由
  const isPublicRoute = publicRoutes.includes(pathname);

  // 获取session token
  const token = request.cookies.get("session")?.value;

  // 验证session
  let session = null;
  if (token) {
    try {
      session = await verifySession(token);
    } catch (error) {
      console.error("Session verification failed:", error);
    }
  }

  // 如果是受保护的路由且没有有效session，重定向到登录页
  if (!isPublicRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 如果已登录且访问登录页，重定向到首页
  if (isPublicRoute && session && pathname === "/login") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// 配置中间件运行的路径
export const config = {
  matcher: [
    // 匹配所有路径，除了api、_next/static、_next/image和图片文件
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
