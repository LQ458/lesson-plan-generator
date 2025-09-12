"use client";

import { useSession } from "next-auth/react";

export function AuthDebugInline() {
  const { data: session, status } = useSession();

  console.log('[AuthDebugInline] Current auth state:', {
    status,
    hasSession: !!session,
    userId: session?.user?.id,
    username: session?.user?.username,
    expires: session?.expires,
    currentTime: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
    cookies: typeof document !== 'undefined' ? document.cookie : 'SSR'
  });

  return (
    <div className="fixed top-20 left-4 z-40 bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg border border-yellow-300 dark:border-yellow-700 max-w-sm">
      <div className="text-xs font-mono">
        <div><strong>Status:</strong> <span className={status === 'authenticated' ? 'text-green-600' : 'text-red-600'}>{status}</span></div>
        <div><strong>Session:</strong> {session ? 'Present' : 'None'}</div>
        {session && (
          <div><strong>User:</strong> {session.user?.username}</div>
        )}
        <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
}