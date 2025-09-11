import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectToDatabase from './mongodb'
import User from '../models/User'

interface AuthUser {
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
      async authorize(credentials): Promise<AuthUser | null> {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          // Connect to MongoDB directly
          await connectToDatabase()
          
          // Find user by username
          const user = await User.findOne({ 
            username: credentials.username,
            isActive: true
          })

          if (!user) {
            console.log('[NextAuth] User not found:', credentials.username)
            return null
          }

          // Validate password
          const isValidPassword = await user.validatePassword(credentials.password)
          
          if (!isValidPassword) {
            console.log('[NextAuth] Invalid password for user:', credentials.username)
            return null
          }

          // Update last login
          await user.updateLastLogin()

          console.log('[NextAuth] Authentication successful for user:', credentials.username)
          
          return {
            id: user._id.toString(),
            username: user.username,
            preferences: user.preferences,
          }
        } catch (error) {
          console.error('[NextAuth] Authentication error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
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
}