// Client-side authentication helper for cross-domain auth issues
'use client';

export interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
  username?: string;
  token?: string;
}

// Get authentication state from multiple sources
export function getClientAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false };
  }

  // Try localStorage first (where navbar might be getting auth info)
  try {
    const stored = localStorage.getItem('authState') || localStorage.getItem('user') || localStorage.getItem('session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && (parsed.userId || parsed.user?.id)) {
        return {
          isAuthenticated: true,
          userId: parsed.userId || parsed.user?.id,
          username: parsed.username || parsed.user?.username,
          token: parsed.token || parsed.accessToken
        };
      }
    }
  } catch (error) {
    console.warn('Failed to parse stored auth state:', error);
  }

  // Try sessionStorage
  try {
    const sessionStored = sessionStorage.getItem('authState') || sessionStorage.getItem('user');
    if (sessionStored) {
      const parsed = JSON.parse(sessionStored);
      if (parsed && (parsed.userId || parsed.user?.id)) {
        return {
          isAuthenticated: true,
          userId: parsed.userId || parsed.user?.id,
          username: parsed.username || parsed.user?.username,
          token: parsed.token || parsed.accessToken
        };
      }
    }
  } catch (error) {
    console.warn('Failed to parse session auth state:', error);
  }

  return { isAuthenticated: false };
}

// Enhanced fetch that includes authentication headers
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authState = getClientAuthState();
  
  // Clone headers to avoid mutation
  const headers = new Headers(options.headers);
  
  // Add multiple auth methods for maximum compatibility
  if (authState.isAuthenticated) {
    // Method 1: Bearer token (if available)
    if (authState.token) {
      headers.set('Authorization', `Bearer ${authState.token}`);
    }
    
    // Method 2: Custom auth header
    if (authState.userId) {
      headers.set('X-Auth-Token', authState.userId);
    }
    
    // Method 3: Client auth state indicator
    headers.set('X-Client-Auth', 'authenticated');
    headers.set('X-User-ID', authState.userId || '');
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Always include cookies
  });
}

// Navigation helper that injects auth headers
export function navigateWithAuth(url: string) {
  const authState = getClientAuthState();
  
  if (authState.isAuthenticated && typeof window !== 'undefined') {
    // For client-side navigation, we'll use a custom approach
    // Since we can't inject headers into browser navigation, we'll use URL params as fallback
    const urlObj = new URL(url, window.location.origin);
    
    // Add auth info as temporary URL parameters that middleware can read
    if (authState.userId) {
      urlObj.searchParams.set('_auth_user', authState.userId);
      urlObj.searchParams.set('_auth_temp', Date.now().toString());
    }
    
    window.location.href = urlObj.toString();
  } else {
    window.location.href = url;
  }
}

// Store auth state after successful login
export function storeAuthState(authData: any) {
  if (typeof window === 'undefined') return;
  
  const authState: AuthState = {
    isAuthenticated: true,
    userId: authData.userId || authData.user?.id,
    username: authData.username || authData.user?.username,
    token: authData.token || authData.accessToken
  };
  
  try {
    localStorage.setItem('authState', JSON.stringify(authState));
    console.log('Auth state stored:', authState);
  } catch (error) {
    console.warn('Failed to store auth state:', error);
  }
}

// Clear auth state on logout
export function clearAuthState() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('authState');
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    sessionStorage.removeItem('authState');
    sessionStorage.removeItem('user');
    console.log('Auth state cleared');
  } catch (error) {
    console.warn('Failed to clear auth state:', error);
  }
}