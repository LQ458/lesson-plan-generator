import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  username: string;
  preferences: {
    theme: string;
    language: string;
    notifications: boolean;
    subject: string;
    gradeLevel: string;
    easyMode: boolean;
  };
  inviteCode?: string;
  iat?: number;
  exp?: number;
  [key: string]: string | Date | number | object | undefined;
}

// 简化：不在前端验证JWT，直接调用后端验证
export async function verifySession(
  token: string,
): Promise<SessionData | null> {
  try {
    // 调用后端验证API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/verify-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

// 获取当前会话
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  return await verifySession(token);
}

// 设置会话cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7天
    path: "/",
  });
}

// 清除会话
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
