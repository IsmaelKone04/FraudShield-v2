import { auth } from "./auth"
import { NextResponse } from "next/server"

/**
 * Contrôle d'accès, exécuté avant le rendu.
 *
 * Le principe est *fail-closed* : tout ce qui n'est pas explicitement public exige
 * une session. C'est le seul réglage tenable ici — la version précédente n'écoutait
 * que `/dashboard`, si bien que `/alertes`, `/investigations`, `/analyses`,
 * `/rapports` et `/parametres` s'ouvraient sans authentification. Avec cette règle,
 * une page ajoutée demain est protégée sans qu'on ait à y penser.
 *
 * Note : Next.js 16 a renommé `middleware.ts` en `proxy.ts`. C'est bien le
 * mécanisme de middleware standard, pas un fichier exotique.
 */

/** Seules routes accessibles sans session (hors `/api/auth/*`, exclu par le matcher). */
const PUBLIC_ROUTES = ["/login"]

export default auth((req) => {
  const { nextUrl } = req
  const { pathname } = nextUrl
  const isLoggedIn = !!req.auth?.user

  if (PUBLIC_ROUTES.includes(pathname)) {
    // Déjà connecté : la page de connexion n'a plus lieu d'être.
    return isLoggedIn
      ? NextResponse.redirect(new URL("/dashboard", nextUrl))
      : undefined
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // Administration : réservée au rôle ADMINISTRATEUR.
  if (
    pathname.startsWith("/dashboard/admin") &&
    req.auth?.user?.role !== "ADMINISTRATEUR"
  ) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }
})

export const config = {
  // Tout, sauf les routes d'authentification et les ressources statiques.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
