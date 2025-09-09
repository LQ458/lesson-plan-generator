import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

export function useSessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      // After successful NextAuth login, sync session with backend domain
      const syncSession = async () => {
        try {
          // Call backend login again to establish session cookies
          const response = await fetch(getApiUrl(API_ENDPOINTS.AUTH.LOGIN), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // This allows setting cookies across domains
            body: JSON.stringify({
              username: session.user.username,
              password: '__NEXTAUTH_SYNC__', // Special password for session sync
            }),
          });

          if (response.ok) {
            console.log('[SessionSync] Backend session synchronized');
          }
        } catch (error) {
          console.error('[SessionSync] Failed to sync session:', error);
        }
      };

      syncSession();
    }
  }, [session]);
}