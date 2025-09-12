"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If we're still loading, don't do anything yet
    if (status === "loading") return;

    // If not authenticated and not loading, redirect to login
    if (status === "unauthenticated") {
      console.log("[AuthGuard] No session found, redirecting to login");
      router.push("/login");
      return;
    }

    // If authenticated, log success
    if (status === "authenticated") {
      console.log("[AuthGuard] Session verified, user:", session?.user);
    }
  }, [status, router, session]);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-blue"></div>
        </div>
      )
    );
  }

  // Show nothing while redirecting unauthenticated users
  if (status === "unauthenticated") {
    return null;
  }

  // Show the protected content for authenticated users
  return <>{children}</>;
}