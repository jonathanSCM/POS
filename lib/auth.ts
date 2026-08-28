import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import * as bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        const headers = (req?.headers ?? {}) as Record<string, string>
        const ip =
          headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          headers["x-real-ip"] ||
          "desconocida"
        const userAgent = headers["user-agent"] || "desconocido"
        const email = credentials?.email || "(vacío)"
        const logCtx = `email=${email} ip=${ip} ua="${userAgent}"`

        if (!credentials?.email || !credentials?.password) {
          console.warn(`[login] FALLO (campos vacíos) ${logCtx}`)
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          console.warn(`[login] FALLO (usuario no existe) ${logCtx}`)
          return null
        }

        if (!user.active) {
          console.warn(`[login] FALLO (usuario inactivo) ${logCtx}`)
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          console.warn(`[login] FALLO (contraseña incorrecta) ${logCtx}`)
          return null
        }

        console.log(`[login] OK role=${user.role} ${logCtx}`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: null,
          userId: user.id,
          userRole: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = (user as any).userId
        token.userRole = (user as any).userRole
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session && session.user) {
        ;(session.user as any).id = token.userId
        ;(session.user as any).role = token.userRole
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
