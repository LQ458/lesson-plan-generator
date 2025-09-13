import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectToDatabase from './mongodb'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

interface AuthUser {
  id: string
  username: string
  preferences: any
}

// Define User schema inline to avoid import issues
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  preferences: {
    theme: { type: String, default: 'system' },
    language: { type: String, default: 'zh_CN' },
    notifications: { type: Boolean, default: true },
    subject: { type: String, default: 'math' },
    gradeLevel: { type: String, default: 'primary_1' },
    easyMode: { type: Boolean, default: true },
  },
  lastLoginAt: Date,
}, { timestamps: true })

// Add methods
userSchema.methods.validatePassword = async function (password: string) {
  return bcrypt.compare(password, this.passwordHash)
}

userSchema.methods.updateLastLogin = function () {
  this.lastLoginAt = new Date()
  return this.save()
}

// Get or create User model
const User = mongoose.models.User || mongoose.model('User', userSchema)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
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
  jwt: {
    // Use a signing algorithm instead of encryption for middleware compatibility
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    // Force JWT instead of JWE for better compatibility with external API
    encode: async ({ secret, token }) => {
      const jwt = require('jsonwebtoken')
      return jwt.sign(token, secret, { algorithm: 'HS256' })
    },
    decode: async ({ secret, token }) => {
      const jwt = require('jsonwebtoken')
      return jwt.verify(token, secret, { algorithms: ['HS256'] })
    }
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
        // Remove domain setting - let NextAuth handle it automatically
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Host-next-auth.csrf-token' 
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.callback-url' 
        : 'next-auth.callback-url',
      options: {
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
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [NextAuth] Redirect callback:`, { url, baseUrl })
      
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        const redirectUrl = `${baseUrl}${url}`
        console.log(`[${timestamp}] [NextAuth] Redirecting to relative URL:`, redirectUrl)
        return redirectUrl
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        console.log(`[${timestamp}] [NextAuth] Redirecting to same origin:`, url)
        return url
      }
      console.log(`[${timestamp}] [NextAuth] Redirecting to baseUrl:`, baseUrl)
      return baseUrl
    },
    async jwt({ token, user }) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [NextAuth] JWT callback - token:`, !!token, 'user:', !!user)
      
      if (user) {
        console.log(`[${timestamp}] [NextAuth] Adding user to token:`, user.username)
        token.username = user.username
        token.preferences = user.preferences
      }
      return token
    },
    async session({ session, token }) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [NextAuth] Session callback - session:`, !!session, 'token:', !!token)
      
      if (token) {
        console.log(`[${timestamp}] [NextAuth] Token data:`, {
          sub: token.sub,
          username: token.username,
          exp: token.exp,
          iat: token.iat
        })
        session.user.id = token.sub as string
        session.user.username = token.username as string
        session.user.preferences = token.preferences
        
        console.log(`[${timestamp}] [NextAuth] Final session:`, {
          userId: session.user.id,
          username: session.user.username,
          expires: session.expires
        })
      }
      return session
    }
  },
  // Use environment variable for secret
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
}