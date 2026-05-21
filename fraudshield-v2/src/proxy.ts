import { auth } from "./auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  // 1. Si l'utilisateur n'est pas connecté et tente d'aller sur le dashboard
  if (nextUrl.pathname.startsWith("/dashboard") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // 2. Exemple de restriction stricte pour l'administration
  if (nextUrl.pathname.startsWith("/dashboard/admin") && req.auth?.user?.role !== "ADMINISTRATEUR") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
