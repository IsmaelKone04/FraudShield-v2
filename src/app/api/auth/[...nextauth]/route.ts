/**
 * Point d'entrée HTTP de NextAuth.
 *
 * `src/auth.ts` construit la configuration et exporte `handlers` ; sans ce fichier
 * pour les monter, toutes les routes `/api/auth/*` répondent 404 et `signIn()` ne
 * peut jamais aboutir — la console entière devient inatteignable puisque `proxy.ts`
 * renvoie vers `/login` toute visite non authentifiée.
 */
import { handlers } from "@/auth"

export const { GET, POST } = handlers

