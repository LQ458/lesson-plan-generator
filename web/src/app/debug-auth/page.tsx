"use client";

import { useState, useEffect } from "react";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // 1. 检查前端cookies
        const frontendCookies = document.cookie
          .split(';')
          .map(cookie => cookie.trim())
          .reduce((acc: any, cookie) => {
            const [name, value] = cookie.split('=');
            acc[name] = value;
            return acc;
          }, {});

        // 2. 检查后端会话状态
        const debugResponse = await fetch(getApiUrl("/api/auth/debug-session"), {
          credentials: "include",
        });
        const debugData = await debugResponse.json();

        // 3. 检查认证状态
        const authResponse = await fetch(getApiUrl(API_ENDPOINTS.AUTH.VERIFY), {
          credentials: "include",
        });
        const authData = authResponse.ok ? await authResponse.json() : { error: "Auth failed" };

        setDebugInfo({
          frontend: {
            cookies: frontendCookies,
            sessionCookie: frontendCookies.session || null,
            domain: window.location.hostname,
            origin: window.location.origin,
          },
          backend: {
            debugSession: debugData,
            authVerify: authData,
            authStatus: authResponse.status,
          },
          api: {
            baseUrl: getApiUrl(),
            verifyEndpoint: getApiUrl(API_ENDPOINTS.AUTH.VERIFY),
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">正在检查认证状态...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">认证调试信息</h1>
        
        <div className="space-y-6">
          {/* 前端信息 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">前端信息</h2>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo?.frontend, null, 2)}
            </pre>
          </div>

          {/* 后端信息 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">后端信息</h2>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo?.backend, null, 2)}
            </pre>
          </div>

          {/* API信息 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">API配置</h2>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo?.api, null, 2)}
            </pre>
          </div>

          {/* 诊断结果 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">诊断结果</h2>
            <div className="space-y-2">
              <div className={`p-2 rounded ${debugInfo?.frontend?.sessionCookie ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                前端Cookie状态: {debugInfo?.frontend?.sessionCookie ? '✅ 存在' : '❌ 缺失'}
              </div>
              <div className={`p-2 rounded ${debugInfo?.backend?.debugSession?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                后端会话状态: {debugInfo?.backend?.debugSession?.success ? '✅ 正常' : '❌ 异常'}
              </div>
              <div className={`p-2 rounded ${debugInfo?.backend?.authVerify?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                认证验证状态: {debugInfo?.backend?.authVerify?.success ? '✅ 通过' : '❌ 失败'}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              刷新检查
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              返回登录
            </button>
            <button
              onClick={() => window.location.href = '/lesson-plan'}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              尝试访问教案页面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}