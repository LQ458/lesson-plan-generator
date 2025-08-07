import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      preferences: any
    } & DefaultSession['user']
  }

  interface User {
    id: string
    username: string
    preferences: any
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username: string
    preferences: any
  }
}