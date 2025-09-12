"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [AuthGuard] ${message}`;
    console.log(logMessage);
    setDebugInfo(prev => [...prev.slice(-9), logMessage]); // Keep last 10 messages
  };

  useEffect(() => {
    addDebug(`Status changed: ${status}`);
    addDebug(`Session data: ${JSON.stringify(session)}`);
    addDebug(`Current URL: ${window.location.href}`);
    
    // If we're still loading, don't do anything yet
    if (status === "loading") {
      addDebug("Still loading session, waiting...");
      return;
    }

    // If not authenticated and not loading, redirect to login
    if (status === "unauthenticated") {
      addDebug("No session found, redirecting to login");
      addDebug(`Redirecting from: ${window.location.pathname} to /login`);
      router.push("/login");
      return;
    }

    // If authenticated, log success
    if (status === "authenticated") {
      addDebug(`Session verified successfully - User: ${session?.user?.username || 'unknown'}`);
      addDebug(`Session expires: ${session?.expires || 'no expiry'}`);
    }
  }, [status, router, session]);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-blue mb-4"></div>
          <p className="text-sm text-gray-600 mb-4">正在验证身份...</p>
          
          {/* Debug info for development */}
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg max-w-2xl w-full">
            <h3 className="font-semibold mb-2">Authentication Debug Info:</h3>
            <div className="text-xs space-y-1 font-mono">
              {debugInfo.map((info, i) => (
                <div key={i} className="break-all">{info}</div>
              ))}
            </div>
          </div>
        </div>
      )
    );
  }

  // Show debug info if unauthenticated for troubleshooting
  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 p-4 rounded-lg max-w-2xl w-full">
          <h3 className="font-semibold mb-2 text-red-700">Authentication Failed - Redirecting to Login</h3>
          <div className="text-xs space-y-1 font-mono text-red-600">
            {debugInfo.map((info, i) => (
              <div key={i} className="break-all">{info}</div>
            ))}
          </div>
          <button 
            onClick={() => router.push("/login")}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show the protected content for authenticated users
  addDebug("Rendering protected content");
  return <>{children}</>;
}