import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, userPreferences } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    // 调用后端验证邀请码
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendResponse = await fetch(`${apiUrl}/api/auth/invite-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inviteCode, userPreferences }),
    });

    const backendData = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: backendData.message || "邀请码验证失败" },
        { status: backendResponse.status },
      );
    }

    // 直接使用后端返回的token，不再前端生成
    const sessionData = backendData.data.sessionData;

    // 创建响应并设置cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "登录成功",
        sessionData: sessionData,
      },
      { status: 200 },
    );

    // 暂时使用简单的session存储，后续会迁移到专业认证库
    response.cookies.set("session", JSON.stringify(sessionData), {
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
