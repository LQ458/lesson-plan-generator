"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export function AuthDebug() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === 'production' && !isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
        >
          Debug Auth
        </button>
      </div>
    );
  }

  if (!isOpen && process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-sm">Auth Status Debug</h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-xs"
          >
            ✕
          </button>
        </div>
        
        <div className="text-xs space-y-2">
          <div>
            <strong>Status:</strong> <span className={status === 'authenticated' ? 'text-green-600' : status === 'loading' ? 'text-yellow-600' : 'text-red-600'}>{status}</span>
          </div>
          
          <div>
            <strong>Session:</strong> {session ? 'Present' : 'None'}
          </div>
          
          {session && (
            <>
              <div>
                <strong>User:</strong> {session.user?.username || 'No username'}
              </div>
              <div>
                <strong>User ID:</strong> {session.user?.id || 'No ID'}
              </div>
              <div>
                <strong>Expires:</strong> {session.expires || 'No expiry'}
              </div>
            </>
          )}
          
          <div>
            <strong>URL:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'SSR'}
          </div>
          
          <div>
            <strong>Timestamp:</strong> {new Date().toISOString()}
          </div>
          
          <div className="pt-2 border-t">
            <strong>Environment:</strong>
            <div className="ml-2">
              <div>NODE_ENV: {process.env.NODE_ENV}</div>
              <div>NEXTAUTH_URL: {process.env.NEXT_PUBLIC_NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'Not set'}</div>
            </div>
          </div>
          
          <div className="pt-2">
            <strong>Cookies:</strong>
            <div className="ml-2 break-all">
              {typeof document !== 'undefined' 
                ? document.cookie.split(';').map(cookie => cookie.trim()).filter(c => c.includes('next-auth')).join('; ') || 'No NextAuth cookies'
                : 'SSR - No document'
              }
            </div>
          </div>
          
          <div className="pt-2">
            <button
              onClick={() => {
                console.log('=== DETAILED AUTH DEBUG ===');
                console.log('Status:', status);
                console.log('Session:', session);
                console.log('All cookies:', typeof document !== 'undefined' ? document.cookie : 'SSR');
                console.log('Location:', typeof window !== 'undefined' ? window.location : 'SSR');
                console.log('User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR');
                console.log('=== END DEBUG ===');
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
            >
              Log to Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}