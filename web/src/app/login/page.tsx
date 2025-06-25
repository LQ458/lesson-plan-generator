"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("请输入邀请码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // 登录成功，跳转到首页
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "邀请码无效");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-apple-blue/5 via-apple-purple/5 to-apple-pink/5 dark:from-apple-blue/10 dark:via-apple-purple/10 dark:to-apple-pink/10">
      <div className="max-w-md w-full mx-4">
        <div className="card p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-apple-blue/10 rounded-3xl">
              <KeyIcon className="w-12 h-12 text-apple-blue" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">
            欢迎使用 TeachAI
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            请输入您的邀请码以开始使用智能教案生成工具
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-left">
              <label
                htmlFor="inviteCode"
                className="block text-sm font-medium mb-2"
              >
                邀请码
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="请输入邀请码"
                className="input text-lg w-full"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                <ExclamationCircleIcon className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="btn btn-primary w-full text-lg py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  验证中...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  开始使用
                </div>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>邀请码由管理员提供</p>
            <p className="mt-1">如有问题请联系技术支持</p>
          </div>

          {/* Demo Codes */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-medium mb-2">演示邀请码：</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["TEACHER2024", "RURAL_EDU_001"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setInviteCode(code)}
                  className="px-3 py-1 bg-apple-blue/10 text-apple-blue text-xs rounded-full hover:bg-apple-blue/20 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
