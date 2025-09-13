import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      success: true,
      session,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nextauthUrl: process.env.NEXTAUTH_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      cookies: {
        sessionToken: !!request.cookies.get('next-auth.session-token'),
        csrfToken: !!request.cookies.get('__Host-next-auth.csrf-token'),
        callbackUrl: !!request.cookies.get('__Secure-next-auth.callback-url'),
      },
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
      }
    })
  } catch (error) {
    console.error('Debug session error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nextauthUrl: process.env.NEXTAUTH_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
    })
  }
}