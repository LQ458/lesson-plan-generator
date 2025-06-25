import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const key = new TextEncoder().encode(secretKey);

// 预设的邀请码列表（生产环境中应该从数据库或环境变量读取）
const INVITE_CODES = [
  "TEACHER2024",
  "RURAL_EDU_001",
  "TEACHAI_INVITE",
  "MOUNTAIN_TEACHER",
  "EDU_HELPER_2024",
];

export interface SessionData {
  userId: string;
  inviteCode: string;
  createdAt: Date;
  [key: string]: string | Date | number; // 更具体的类型而不是any
}

// 验证邀请码
export function validateInviteCode(code: string): boolean {
  return INVITE_CODES.includes(code.toUpperCase());
}

// 创建会话token
export async function createSession(inviteCode: string): Promise<string> {
  const payload: SessionData = {
    userId: `user_${Date.now()}`, // 简单的用户ID生成
    inviteCode: inviteCode.toUpperCase(),
    createdAt: new Date(),
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // 7天过期
    .sign(key);
}

// 验证会话token
export async function verifySession(
  token: string,
): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as SessionData;
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
