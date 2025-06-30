import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "未认证" }, { status: 401 });
    }

    // 解析session数据
    const session = JSON.parse(sessionCookie);

    return NextResponse.json({
      success: true,
      session: {
        userId: session.userId,
        username: session.username || "用户",
        preferences: session.userPreferences || session.preferences,
        inviteCode: session.inviteCode,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ error: "认证失败" }, { status: 401 });
  }
}
