"use client";

import { useSession, getSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const [serverSession, setServerSession] = useState<any>(null);
  const [apiTest, setApiTest] = useState("");
  const [cookieInfo, setCookieInfo] = useState("");
  const [networkInfo, setNetworkInfo] = useState("");

  useEffect(() => {
    // Test server-side session
    getSession().then((session) => {
      setServerSession(session);
    });

    // Get cookie info
    setCookieInfo(typeof document !== 'undefined' ? document.cookie : 'No cookies');

    // Test API connectivity
    fetch('/api/auth/session', { 
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        setApiTest(`API Response: ${JSON.stringify(data)}`);
      })
      .catch(err => {
        setApiTest(`API Error: ${err.message}`);
      });

    // Network info
    setNetworkInfo(`
      Location: ${typeof window !== 'undefined' ? window.location.href : 'SSR'}
      User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'}
      Protocol: ${typeof window !== 'undefined' ? window.location.protocol : 'SSR'}
    `);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🔍 Authentication Debug Panel</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Session Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📱 Client Session (useSession)</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Status:</strong> <span className={`px-2 py-1 rounded ${
                status === 'authenticated' ? 'bg-green-100 text-green-800' :
                status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>{status}</span></div>
              <div><strong>Session Data:</strong></div>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </div>

          {/* Server Session Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🖥️ Server Session (getSession)</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Server Session:</strong></div>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(serverSession, null, 2)}
              </pre>
            </div>
          </div>

          {/* API Test */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🔗 API Connectivity</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Session API Test:</strong></div>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto">
                {apiTest || 'Loading...'}
              </pre>
            </div>
          </div>

          {/* Environment Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🌍 Environment Info</h2>
            <div className="space-y-2 text-sm">
              <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
              <div><strong>NEXTAUTH_URL:</strong> {process.env.NEXTAUTH_URL || 'Not set'}</div>
              <div><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</div>
              <div><strong>Network Info:</strong></div>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto">
                {networkInfo}
              </pre>
            </div>
          </div>

          {/* Cookie Debug */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">🍪 Cookie Information</h2>
            <div className="space-y-2 text-sm">
              <div><strong>All Cookies:</strong></div>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto">
                {cookieInfo}
              </pre>
              <div><strong>NextAuth Cookies:</strong></div>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto">
                {typeof document !== 'undefined' ? 
                  document.cookie.split(';')
                    .filter(c => c.includes('next-auth'))
                    .join(';\n') || 'No NextAuth cookies found'
                  : 'No document available'}
              </pre>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                🔄 Refresh Page
              </button>
              <button 
                onClick={() => window.location.href = '/api/auth/signin'}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                🔑 Go to NextAuth Sign In
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                📝 Go to Custom Login
              </button>
              <button 
                onClick={() => window.location.href = '/api/auth/signout'}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>🕐 Generated at: {new Date().toISOString()}</p>
          <p>Access this page at: <code>/debug-auth</code></p>
        </div>
      </div>
    </div>
  );
}