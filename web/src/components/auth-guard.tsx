"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useCallback } from "react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const handleRedirect = useCallback(() => {
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      handleRedirect();
    }
  }, [status, handleRedirect]);

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

  // Show the protected content for authenticated users
  if (status === "authenticated") {
    return <>{children}</>;
  }

  // If unauthenticated, return null (redirect will happen in useEffect)
  return null;
}