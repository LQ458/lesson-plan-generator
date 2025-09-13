"use client";

import { useSession, getSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AuthFlowDebugPage() {
  const { data: session, status } = useSession();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Auto-run tests when session changes
  useEffect(() => {
    if (status === "authenticated") {
      runAllTests();
    }
  }, [status]);

  const testEndpoints = [
    { name: "NextAuth Session API", url: "/api/auth/session", method: "GET" },
    { name: "Express Test Endpoint", url: "/server/test", method: "GET" },
    { name: "Express Auth Test", url: "/server/test-auth", method: "GET" },
    { name: "Express Lesson Plan", url: "/server/lesson-plan", method: "POST", body: { subject: "数学", grade: "小学一年级", topic: "加法测试" } },
  ];

  const runTest = async (test: any) => {
    const key = test.name;
    setTestResults(prev => ({ ...prev, [key]: { loading: true } }));
    
    try {
      const options: RequestInit = {
        method: test.method,
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      console.log(`Testing ${test.name}:`, test.url, options);
      
      const response = await fetch(test.url, options);
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: data,
          headers: Object.fromEntries(response.headers.entries()),
          loading: false
        }
      }));
    } catch (error) {
      console.error(`Test ${test.name} failed:`, error);
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false
        }
      }));
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    for (const test of testEndpoints) {
      await runTest(test);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between tests
    }
    setIsLoading(false);
  };

  const getCookieInfo = () => {
    if (typeof document === 'undefined') return 'SSR - No cookies available';
    
    const cookies = document.cookie.split(';').reduce((acc: Record<string, string>, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    return {
      allCookies: Object.keys(cookies),
      nextAuthCookies: Object.keys(cookies).filter(key => key.includes('next-auth')),
      sessionToken: cookies['next-auth.session-token'] ? 'Present (length: ' + cookies['next-auth.session-token'].length + ')' : 'Not found',
      secureSessionToken: cookies['__Secure-next-auth.session-token'] ? 'Present (length: ' + cookies['__Secure-next-auth.session-token'].length + ')' : 'Not found',
      hostSessionToken: cookies['__Host-next-auth.session-token'] ? 'Present (length: ' + cookies['__Host-next-auth.session-token'].length + ')' : 'Not found',
      csrfToken: cookies['next-auth.csrf-token'] || cookies['__Host-next-auth.csrf-token'] ? 'Present' : 'Not found'
    };
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🔍 Authentication Flow Debug</h1>
        
        {/* Session Status */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📊 Session Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <strong>Status:</strong> 
              <span className={`ml-2 px-3 py-1 rounded ${
                status === 'authenticated' ? 'bg-green-100 text-green-800' :
                status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {status}
              </span>
            </div>
            <div>
              <strong>User ID:</strong> {session?.user?.id || 'N/A'}
            </div>
            <div>
              <strong>Username:</strong> {session?.user?.username || 'N/A'}
            </div>
          </div>
          
          <div className="mt-4">
            <strong>Full Session:</strong>
            <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded mt-2 text-sm overflow-auto max-h-40">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>

        {/* Cookie Information */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🍪 Cookie Analysis</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(getCookieInfo(), null, 2)}
          </pre>
        </div>

        {/* Test Controls */}
        <div className="mb-6 text-center">
          <button 
            onClick={runAllTests}
            disabled={isLoading || status !== 'authenticated'}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '🔄 Testing...' : '🧪 Run All Tests'}
          </button>
          
          {status !== 'authenticated' && (
            <p className="mt-2 text-yellow-600">Please log in first to run authentication tests</p>
          )}
        </div>

        {/* Test Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {testEndpoints.map((test) => {
            const result = testResults[test.name];
            const isLoading = result?.loading;
            const isSuccess = result?.success;
            
            return (
              <div key={test.name} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">{test.name}</h3>
                  <button 
                    onClick={() => runTest(test)}
                    disabled={isLoading || status !== 'authenticated'}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-400"
                  >
                    {isLoading ? '🔄' : 'Test'}
                  </button>
                </div>
                
                <div className="text-sm space-y-2">
                  <div><strong>Method:</strong> {test.method}</div>
                  <div><strong>URL:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{test.url}</code></div>
                  
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
                      
                      {result.error && (
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

                      {result.headers && Object.keys(result.headers).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-semibold">Response Headers</summary>
                          <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs mt-1 overflow-auto max-h-24">
                            {JSON.stringify(result.headers, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Environment Info */}
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🌍 Environment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
            <div><strong>NEXTAUTH_URL:</strong> {process.env.NEXTAUTH_URL || 'Not set'}</div>
            <div><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</div>
            <div><strong>Protocol:</strong> {typeof window !== 'undefined' ? window.location.protocol : 'SSR'}</div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>🕐 Generated at: {new Date().toISOString()}</p>
        </div>
      </div>
    </div>
  );
}