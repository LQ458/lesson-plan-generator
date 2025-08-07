'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClientAuthState, navigateWithAuth, storeAuthState } from '@/lib/auth-helper';

interface AuthNavigationProps {
  children: React.ReactNode;
}

export default function AuthNavigation({ children }: AuthNavigationProps) {
  const [isClient, setIsClient] = useState(false);
  const [authState, setAuthState] = useState(getClientAuthState());
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    // Check for auth state changes
    const checkAuthState = () => {
      const newAuthState = getClientAuthState();
      setAuthState(newAuthState);
    };
    
    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkAuthState);
    
    // Check auth state periodically
    const interval = setInterval(checkAuthState, 5000);
    
    return () => {
      window.removeEventListener('storage', checkAuthState);
      clearInterval(interval);
    };
  }, []);

  // Handle link clicks to protected routes
  useEffect(() => {
    if (!isClient) return;

    const handleClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (!link || !link.href) return;
      
      const url = new URL(link.href);
      const pathname = url.pathname;
      
      // Check if this is a protected route
      const protectedRoutes = ['/lesson-plan', '/exercises', '/my-content', '/settings'];
      const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
      
      if (isProtectedRoute && authState.isAuthenticated) {
        // Prevent default navigation
        event.preventDefault();
        
        // Use our custom navigation with auth
        navigateWithAuth(pathname);
      }
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [isClient, authState.isAuthenticated]);

  // Auto-store auth state if we detect successful authentication
  useEffect(() => {
    if (!isClient) return;

    const checkForAuthSuccess = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.user && !authState.isAuthenticated) {
            // We have server auth but not client auth - sync them
            storeAuthState({
              userId: userData.user.id || userData.userId,
              username: userData.user.username || userData.username,
              token: userData.token
            });
            setAuthState(getClientAuthState());
          }
        }
      } catch (error) {
        console.warn('Auth check failed:', error);
      }
    };

    checkForAuthSuccess();
  }, [isClient, authState.isAuthenticated]);

  if (!isClient) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

// Custom Link component for protected routes
interface AuthLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthLink({ href, children, className }: AuthLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const authState = getClientAuthState();
    
    if (authState.isAuthenticated) {
      navigateWithAuth(href);
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}