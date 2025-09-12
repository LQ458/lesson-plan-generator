import { useSession } from 'next-auth/react';

export function useSessionSync() {
  const { data: session } = useSession();

  // Session sync is no longer needed since NextAuth handles everything
  // Backend API requests will use NextAuth session directly
  
  return session;
}