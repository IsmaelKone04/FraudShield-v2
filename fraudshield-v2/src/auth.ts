import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Typage des extensions pour que TypeScript reconnaisse le champ "role"
declare module "next-auth" {
  interface User {
    role?: string
  }
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        const users = [
          { id: "1", name: "Diallo Admin", email: "admin@fraudshield.com", role: "ADMINISTRATEUR" },
          { id: "2", name: "Ndiaye Super", email: "superviseur@fraudshield.com", role: "SUPERVISEUR" },
          { id: "3", name: "Sow Analyst", email: "analyste@fraudshield.com", role: "ANALYSTE" },
        ]

        const user = users.find((u) => u.email === credentials?.email)
        if (user) return user
        return null
      }
    })
  ],
  // Force l'utilisation du secret défini dans vos variables d'environnement
  secret: process.env.BETTER_AUTH_SECRET, 
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  }
})
