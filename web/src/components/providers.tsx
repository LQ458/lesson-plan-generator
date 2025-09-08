"use client";

import { SessionProvider } from "next-auth/react";
import { useSessionSync } from "@/hooks/useSessionSync";

function SessionSyncWrapper({ children }: { children: React.ReactNode }) {
  useSessionSync();
  return <>{children}</>;
}

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SessionSyncWrapper>
        {children}
      </SessionSyncWrapper>
    </SessionProvider>
  );
}