import { NextRequest, NextResponse } from "next/server";
import { validateInviteCode, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    // 验证邀请码
    if (!validateInviteCode(inviteCode)) {
      return NextResponse.json(
        { error: "邀请码无效或已过期" },
        { status: 401 },
      );
    }

    // 创建会话token
    const token = await createSession(inviteCode);

    // 创建响应并设置cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "登录成功",
      },
      { status: 200 },
    );

    // 设置httpOnly cookie
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "服务器错误，请重试" }, { status: 500 });
  }
}
