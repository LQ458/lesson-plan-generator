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
    // Add some debugging for production issues
    console.log('[Middleware] Protected route accessed:', req.nextUrl.pathname)
    console.log('[Middleware] Has token:', !!req.nextauth.token)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        console.log('[Middleware] Authorizing:', pathname, 'Has token:', !!token)
        
        // Allow NextAuth API routes always
        if (pathname.startsWith('/api/auth')) {
          console.log('[Middleware] Allowing NextAuth API route')
          return true
        }
        
        // Allow access to public routes
        if (pathname === '/' || pathname === '/login') {
          console.log('[Middleware] Allowing public route')
          return true
        }
        
        // For protected routes, check if user has a valid token
        const isProtectedRoute = protectedRoutes.some(route => 
          pathname.startsWith(route)
        )
        
        if (isProtectedRoute) {
          const hasToken = !!token
          console.log('[Middleware] Protected route, has token:', hasToken)
          if (!hasToken) {
            console.log('[Middleware] Redirecting to login - no valid token')
          }
          return hasToken
        }
        
        // Allow access to other routes
        console.log('[Middleware] Allowing other route')
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
    // Match all request paths except for the ones starting with:
    // - api (but allow /api/auth/* for NextAuth)
    // - _next/static (static files)
    // - _next/image (image optimization files)  
    // - favicon.ico (favicon file)
    // - public files with extensions
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(png|jpg|jpeg|gif|svg|ico|css|js)$).*)',
  ],
}