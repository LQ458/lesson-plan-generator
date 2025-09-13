"use client";

import { useState } from "react";

export default function RouteDebugPage() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  
  const testRoutes = [
    { name: "NextAuth Session", url: "/api/auth/session", method: "GET" },
    { name: "Debug Session API", url: "/api/debug-session", method: "GET" },
    { name: "Express Health", url: "/server/health", method: "GET" },
    { name: "Express Status", url: "/server/status", method: "GET" },
    { name: "Express Test", url: "/server/test", method: "GET" },
    { name: "Express Auth Test", url: "/server/test-auth", method: "GET" },
    { name: "Express Root", url: "/server", method: "GET" },
  ];

  const testRoute = async (route: { name: string; url: string; method: string }) => {
    setTestResults(prev => ({ ...prev, [route.name]: "Testing..." }));
    
    try {
      const response = await fetch(route.url, {
        method: route.method,
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      
      setTestResults(prev => ({
        ...prev,
        [route.name]: {
          status: response.status,
          statusText: response.statusText,
          data: data,
          success: response.ok
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [route.name]: {
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        }
      }));
    }
  };

  const testAllRoutes = async () => {
    for (const route of testRoutes) {
      await testRoute(route);
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🛣️ Route Debug Panel</h1>
        
        <div className="mb-6 text-center">
          <button 
            onClick={testAllRoutes}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mr-4"
          >
            🧪 Test All Routes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testRoutes.map((route) => {
            const result = testResults[route.name];
            const isLoading = result === "Testing...";
            const isSuccess = result?.success;
            const hasError = result?.error;
            
            return (
              <div key={route.name} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">{route.name}</h3>
                  <button 
                    onClick={() => testRoute(route)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Test
                  </button>
                </div>
                
                <div className="text-sm space-y-2">
                  <div><strong>URL:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{route.url}</code></div>
                  <div><strong>Method:</strong> {route.method}</div>
                  
                  {isLoading && (
                    <div className="text-blue-600">🔄 Testing...</div>
                  )}
                  
                  {result && !isLoading && (
                    <div className="space-y-2">
                      <div className={`font-semibold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                        {isSuccess ? '✅ Success' : '❌ Failed'}
                      </div>
                      
                      {result.status && (
                        <div><strong>Status:</strong> {result.status} {result.statusText}</div>
                      )}
                      
                      {hasError && (
                        <div className="text-red-600"><strong>Error:</strong> {result.error}</div>
                      )}
                      
                      {result.data && (
                        <div>
                          <strong>Response:</strong>
                          <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-auto mt-1 max-h-32">
                            {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Network Information */}
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🌐 Network Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'SSR'}
            </div>
            <div>
              <strong>Host:</strong> {typeof window !== 'undefined' ? window.location.host : 'SSR'}
            </div>
            <div>
              <strong>Protocol:</strong> {typeof window !== 'undefined' ? window.location.protocol : 'SSR'}
            </div>
            <div>
              <strong>Port:</strong> {typeof window !== 'undefined' ? window.location.port || '(default)' : 'SSR'}
            </div>
          </div>
        </div>

        {/* nginx Configuration Display */}
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">⚙️ Expected nginx Configuration</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
{`# NextAuth routes to Next.js (port 3000)
location /api/auth/ {
    proxy_pass http://127.0.0.1:3000/api/auth/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Express routes to Express server (port 3001)
location /server/ {
    proxy_pass http://127.0.0.1:3001/server/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}