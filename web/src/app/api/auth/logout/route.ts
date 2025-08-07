import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "已登出" },
    { status: 200 },
  );

  // 清除session cookie - 必须与设置时的options完全一致
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0, // 立即过期
    path: "/",
    // 添加domain以匹配后端设置的cookie
    ...(process.env.NODE_ENV === "production" && { domain: ".bijielearn.com" })
  });

  return response;
}
