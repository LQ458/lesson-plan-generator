import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getApiUrl, API_ENDPOINTS } from './api-config'

interface User {
  id: string
  username: string
  preferences: any
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        inviteCode: { label: 'Invite Code', type: 'text' }
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.username || !credentials?.password) {
          console.log('[NextAuth] Missing credentials')
          return null
        }

        try {
          console.log('[NextAuth] Attempting login for username:', credentials.username)
          
          // Call backend API to verify credentials
          const response = await fetch(getApiUrl(API_ENDPOINTS.AUTH.LOGIN), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          })

          console.log('[NextAuth] Backend response status:', response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.log('[NextAuth] Backend error response:', errorText)
            return null
          }

          const data = await response.json()
          console.log('[NextAuth] Backend response data:', {
            success: data.success,
            hasUser: !!data.data?.user,
            userId: data.data?.user?._id,
            username: data.data?.user?.username
          })

          if (data.success && data.data?.user) {
            const user = {
              id: data.data.user._id,
              username: data.data.user.username,
              preferences: data.data.user.preferences,
            }
            console.log('[NextAuth] Returning user:', user)
            return user
          }

          console.log('[NextAuth] Invalid response structure, returning null')
          return null
        } catch (error) {
          console.error('[NextAuth] Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username
        token.preferences = user.preferences
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.username = token.username as string
        session.user.preferences = token.preferences
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}