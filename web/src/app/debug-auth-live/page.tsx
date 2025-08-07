'use client';

import { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';
import { getClientAuthState, storeAuthState } from '@/lib/auth-helper';

export default function DebugAuthLivePage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>({});

  const runCompleteTest = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // 1. Check client-side auth state
      results.clientAuth = getClientAuthState();

      // 2. Check cookies directly
      results.cookies = document.cookie.split(';').reduce((acc: any, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});

      // 3. Test API auth endpoint
      try {
        const authResponse = await fetch(getApiUrl(API_ENDPOINTS.AUTH.VERIFY), {
          credentials: 'include',
        });
        results.apiAuth = {
          status: authResponse.status,
          ok: authResponse.ok,
          headers: Object.fromEntries(authResponse.headers.entries()),
          data: authResponse.ok ? await authResponse.json() : await authResponse.text()
        };
      } catch (error) {
        results.apiAuth = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // 4. Test with manual auth headers
      try {
        const clientAuth = getClientAuthState();
        const manualHeaders: any = {
          'Content-Type': 'application/json',
        };

        if (clientAuth.isAuthenticated) {
          if (clientAuth.token) {
            manualHeaders['Authorization'] = `Bearer ${clientAuth.token}`;
          }
          manualHeaders['X-Auth-Token'] = clientAuth.userId || 'test';
          manualHeaders['X-Client-Auth'] = 'authenticated';
        }

        const manualResponse = await fetch(getApiUrl(API_ENDPOINTS.AUTH.VERIFY), {
          credentials: 'include',
          headers: manualHeaders
        });

        results.manualAuth = {
          status: manualResponse.status,
          ok: manualResponse.ok,
          headers: Object.fromEntries(manualResponse.headers.entries()),
          data: manualResponse.ok ? await manualResponse.json() : await manualResponse.text()
        };
      } catch (error) {
        results.manualAuth = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // 5. Test middleware headers by making a request to any protected route
      try {
        const middlewareResponse = await fetch('/lesson-plan', {
          method: 'GET',
          credentials: 'include',
        });
        
        results.middleware = {
          status: middlewareResponse.status,
          redirected: middlewareResponse.redirected,
          url: middlewareResponse.url,
          headers: {
            'X-Auth-Status': middlewareResponse.headers.get('X-Auth-Status'),
            'X-Auth-Method': middlewareResponse.headers.get('X-Auth-Method'),
            'X-Cookie-Present': middlewareResponse.headers.get('X-Cookie-Present'),
            'X-Auth-Debug': middlewareResponse.headers.get('X-Auth-Debug')
          }
        };
      } catch (error) {
        results.middleware = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: 'test',
          password: 'test123'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store auth state
        storeAuthState({
          userId: data.userId || data.user?.id || '6891db29feb0a40a2d2b1a31',
          username: data.username || data.user?.username || 'test',
          token: data.token || data.accessToken
        });
        
        // Re-run tests
        await runCompleteTest();
      }
      
      alert(`Login result: ${response.status} - ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`Login error: ${error}`);
    }
  };

  useEffect(() => {
    runCompleteTest();
  }, []);

  const forceNavigation = () => {
    const clientAuth = getClientAuthState();
    if (clientAuth.isAuthenticated) {
      const url = new URL('/lesson-plan', window.location.origin);
      url.searchParams.set('_auth_user', clientAuth.userId || 'test');
      url.searchParams.set('_auth_temp', Date.now().toString());
      window.location.href = url.toString();
    } else {
      alert('No client auth state found');
    }
  };

  if (loading) {
    return <div className="p-8">Running complete authentication test...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Live Authentication Debug</h1>
      
      <div className="flex gap-4 mb-6">
        <button 
          onClick={runCompleteTest}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔄 Refresh Tests
        </button>
        <button 
          onClick={testLogin}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          🔑 Test Login
        </button>
        <button 
          onClick={forceNavigation}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          🚀 Force Navigate to Lesson Plan
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(testResults).map(([testName, result]) => (
          <div key={testName} className="border p-4 rounded">
            <h3 className="font-bold text-lg mb-2">
              {testName === 'clientAuth' ? '📱 Client Auth State' :
               testName === 'cookies' ? '🍪 Browser Cookies' :
               testName === 'apiAuth' ? '🔌 API Auth Test' :
               testName === 'manualAuth' ? '⚡ Manual Header Auth Test' :
               testName === 'middleware' ? '🛡️ Middleware Test' : testName}
            </h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      {testResults.middleware?.headers?.['X-Auth-Debug'] && (
        <div className="mt-6 border-2 border-red-500 p-4 rounded">
          <h3 className="font-bold text-lg mb-2">🚨 Middleware Debug Info</h3>
          <pre className="bg-red-50 p-3 rounded text-sm">
            {testResults.middleware.headers['X-Auth-Debug']}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 rounded">
        <h3 className="font-bold">💡 Quick Diagnosis:</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li>✅ Backend is setting cookies (from your logs)</li>
          <li>{testResults.cookies?.session ? '✅' : '❌'} Session cookie present in browser</li>
          <li>{testResults.clientAuth?.isAuthenticated ? '✅' : '❌'} Client auth state active</li>
          <li>{testResults.apiAuth?.ok ? '✅' : '❌'} API auth endpoint responding</li>
          <li>{testResults.middleware?.headers?.['X-Auth-Status'] === 'authenticated' ? '✅' : '❌'} Middleware authentication</li>
        </ul>
      </div>
    </div>
  );
}