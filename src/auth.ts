import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { COMPTES } from "@/lib/utilisateurs"

// L'import est nécessaire pour que TypeScript accepte d'augmenter le module
// "next-auth/jwt" plus bas (sans lui : TS2664). Il paraît inutilisé à ESLint,
// d'où la désactivation ciblée : le retirer casse la compilation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JWT } from "next-auth/jwt"

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

/**
 * Comptes de démonstration.
 *
 * Ce répertoire local n'existe que pour faire tourner la console sans backend.
 * En cible, l'authentification est déléguée à l'API FastAPI — sur le même principe
 * de bascule que `src/lib/services/dashboard.service.ts` : ce provider est alors
 * remplacé par un appel à `POST /auth/login`.
 *
 * Les identités elles-mêmes viennent de `src/lib/utilisateurs.ts`, qui sert aussi
 * à l'assignation des alertes : une seconde liste de comptes finirait par
 * diverger de celle-ci. Seules les empreintes bcrypt restent ici — ce fichier
 * n'est jamais envoyé au navigateur. Les mots de passe ne sont à aucun moment
 * stockés en clair, même pour une démonstration. Mot de passe des trois
 * comptes : `Demo1234!` (documenté dans le README — ces comptes ne donnent accès
 * qu'à des données fictives).
 */
const EMPREINTES = new Map<string, string>([
  [
    "admin@fraudshield.com",
    "$2b$12$0MYDQb4NjKNC1SkGNOkzEuSHtwNlBYu2Yl7OI9Ufqal/iOupMu5KO",
  ],
  [
    "superviseur@fraudshield.com",
    "$2b$12$FIM8LhwaEsWSlvENk2zaP.g0zwWdsBxD1YXW9Usd9Nm3J/OrJJyry",
  ],
  [
    "analyste@fraudshield.com",
    "$2b$12$nntOX98jHttZa2txOVjj7uIl3JAeV0Jbi4cG8BOJLwi3MGCzYMkuC",
  ],
])

const DEMO_USERS = COMPTES.map((compte) => {
  const passwordHash = EMPREINTES.get(compte.email)
  // Un compte sans empreinte est une erreur de programmation : mieux vaut
  // refuser de démarrer que laisser une identité sans moyen de connexion.
  if (!passwordHash) {
    throw new Error(`Aucune empreinte de mot de passe pour ${compte.email}`)
  }
  return {
    id: compte.id,
    name: compte.nom,
    email: compte.email,
    role: compte.role,
    passwordHash,
  }
})

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

/**
 * Empreinte-leurre, utilisée quand aucun compte ne correspond à l'e-mail saisi.
 *
 * On effectue quand même une comparaison bcrypt : sans cela, un e-mail inconnu
 * répondrait bien plus vite qu'un e-mail connu, ce qui permettrait d'énumérer
 * les comptes existants en mesurant le temps de réponse. Le coût du leurre doit
 * donc être celui des vraies empreintes — d'où le même facteur 12.
 *
 * **C'est l'empreinte d'un secret aléatoire de 32 octets qui n'a jamais été
 * conservé** : aucun mot de passe ne peut lui correspondre. Elle reprenait
 * jusqu'ici, à l'identique, l'empreinte du compte administrateur. La garde
 * `!user ||` en dessous rendait cela sans conséquence — la comparaison ne
 * décide rien quand le compte n'existe pas — mais réutiliser une empreinte
 * valide comme leurre est un piège armé pour la prochaine refactorisation :
 * il suffit qu'un jour la condition soit réordonnée en `valid && user` pour
 * que le mot de passe de l'administrateur ouvre n'importe quel e-mail inconnu.
 */
const EMPREINTE_LEURRE =
  "$2b$12$kbrkMx7.h.bjQbGmLEqoc.4p2ysVgdjtyceZHdcqFnjlSPmK3Ywqu"

// Le leurre ne doit être l'empreinte d'aucun compte réel. La règle est
// vérifiée au démarrage plutôt que confiée à la relecture : c'est exactement
// l'erreur qui vient d'être corrigée, et rien n'empêchait de la refaire.
if ([...EMPREINTES.values()].includes(EMPREINTE_LEURRE)) {
  throw new Error(
    "L'empreinte-leurre est celle d'un compte réel : en générer une dédiée."
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = DEMO_USERS.find(
          (u) => u.email === email.toLowerCase().trim()
        )

        const valid = await bcrypt.compare(
          password,
          user?.passwordHash ?? EMPREINTE_LEURRE
        )
        if (!user || !valid) return null

        // L'empreinte n'est jamais renvoyée dans la session.
        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
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
    },
  },
  pages: {
    signIn: "/login",
  },
})
