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
          return null
        }

        try {
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

          if (!response.ok) {
            return null
          }

          const data = await response.json()

          if (data.success && data.data?.user) {
            return {
              id: data.data.user._id,
              username: data.data.user.username,
              preferences: data.data.user.preferences,
            }
          }

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
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
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
  // Use environment variable for secret
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  // Trust host in production deployments
  trustHost: true,
}