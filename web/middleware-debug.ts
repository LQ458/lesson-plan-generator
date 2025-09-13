import { withAuth } from 'next-auth/middleware'

// Protected routes that require authentication
const protectedRoutes = [
  '/lesson-plan',
  '/exercises', 
  '/my-content',
  '/settings'
]

export default withAuth(
  function middleware(req) {
    // Debug logging for production
    if (process.env.NODE_ENV === 'production') {
      console.log('=== MIDDLEWARE DEBUG ===');
      console.log('Path:', req.nextUrl.pathname);
      console.log('Has token:', !!req.nextauth.token);
      console.log('Token exp:', req.nextauth.token?.exp);
      console.log('Current time:', Math.floor(Date.now() / 1000));
      console.log('All cookies:', req.cookies.getAll().map(c => c.name));
      console.log('========================');
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow NextAuth API routes always
        if (pathname.startsWith('/api/auth')) {
          return true
        }
        
        // Allow debug route
        if (pathname.startsWith('/debug-auth')) {
          return true
        }
        
        // Allow other API routes to pass through - they handle their own auth
        if (pathname.startsWith('/api/')) {
          return true
        }
        
        // Allow access to public routes
        if (pathname === '/' || pathname === '/login') {
          return true
        }
        
        // For protected routes, check if user has a valid session
        const isProtectedRoute = protectedRoutes.some(route => 
          pathname.startsWith(route)
        )
        
        if (isProtectedRoute) {
          // Debug logging for production
          if (process.env.NODE_ENV === 'production') {
            console.log('=== PROTECTED ROUTE DEBUG ===');
            console.log('Route:', pathname);
            console.log('Token present:', !!token);
            console.log('Session cookie:', !!req.cookies.get('next-auth.session-token'));
            console.log('CSRF token:', !!req.cookies.get('__Host-next-auth.csrf-token'));
            console.log('==============================');
          }
          
          // Check if we have a NextAuth session cookie
          const sessionCookie = req.cookies.get('next-auth.session-token')
          
          if (sessionCookie) {
            // If we have a session cookie, let the client-side AuthGuard handle validation
            return true
          } else {
            return false
          }
        }
        
        // Allow access to other routes
        return true
      },
    },
    pages: {
      signIn: '/login'
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Allow API routes so NextAuth can work properly
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}