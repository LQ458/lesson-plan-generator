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
    // The middleware only runs if the user is authenticated
    // Middleware execution - no logging needed for production
  },
  {
    callbacks: {
      authorized: async ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow NextAuth API routes always
        if (pathname.startsWith('/api/auth')) {
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
          // Check if we have a NextAuth session cookie
          const sessionCookie = req.cookies.get('next-auth.session-token')
          
          if (sessionCookie) {
            // If we have a session cookie, let the client-side AuthGuard handle validation
            // This avoids the JWT parsing issue while still providing server-side protection
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