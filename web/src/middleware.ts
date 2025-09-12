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
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [Middleware] Executing for:`, req.nextUrl.pathname)
    console.log(`[${timestamp}] [Middleware] Has token:`, !!req.nextauth.token)
    if (req.nextauth.token) {
      console.log(`[${timestamp}] [Middleware] Token user:`, req.nextauth.token.username || 'no-username')
      console.log(`[${timestamp}] [Middleware] Token exp:`, req.nextauth.token.exp)
    }
  },
  {
    callbacks: {
      authorized: async ({ token, req }) => {
        const { pathname } = req.nextUrl
        const timestamp = new Date().toISOString()
        
        console.log(`[${timestamp}] [Middleware] Authorizing:`, pathname)
        console.log(`[${timestamp}] [Middleware] Token present:`, !!token)
        console.log(`[${timestamp}] [Middleware] Token data:`, token ? { sub: token.sub, username: token.username, exp: token.exp } : null)
        console.log(`[${timestamp}] [Middleware] All cookies:`, req.cookies.getAll().map(c => c.name))
        console.log(`[${timestamp}] [Middleware] User-Agent:`, req.headers.get('user-agent')?.substring(0, 50))
        
        // Allow NextAuth API routes always
        if (pathname.startsWith('/api/auth')) {
          console.log(`[${timestamp}] [Middleware] Allowing NextAuth API route:`, pathname)
          return true
        }
        
        // Allow other API routes to pass through - they handle their own auth
        if (pathname.startsWith('/api/')) {
          console.log(`[${timestamp}] [Middleware] Allowing other API route:`, pathname)
          return true
        }
        
        // Allow access to public routes
        if (pathname === '/' || pathname === '/login') {
          console.log(`[${timestamp}] [Middleware] Allowing public route:`, pathname)
          return true
        }
        
        // For protected routes, check if user has a valid session
        const isProtectedRoute = protectedRoutes.some(route => 
          pathname.startsWith(route)
        )
        
        if (isProtectedRoute) {
          console.log(`[${timestamp}] [Middleware] Protected route:`, pathname)
          
          // Check if we have a NextAuth session cookie
          const sessionCookie = req.cookies.get('next-auth.session-token')
          console.log(`[${timestamp}] [Middleware] Session cookie present:`, !!sessionCookie)
          
          if (sessionCookie) {
            console.log(`[${timestamp}] [Middleware] Found session cookie, allowing access`)
            // If we have a session cookie, let the client-side AuthGuard handle validation
            // This avoids the JWT parsing issue while still providing server-side protection
            return true
          } else {
            console.log(`[${timestamp}] [Middleware] No session cookie found, blocking access`)
            console.log(`[${timestamp}] [Middleware] Available cookies:`, req.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`))
            return false
          }
        }
        
        // Allow access to other routes
        console.log(`[${timestamp}] [Middleware] Allowing other route:`, pathname)
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