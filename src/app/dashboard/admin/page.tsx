import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { ActeurJournal } from "@/components/acteur-journal"
import { JournalClient } from "./journal-client"

export const metadata = { title: "Journal d'audit" }

/**
 * La route existait déjà dans `proxy.ts` — réservée au rôle ADMINISTRATEUR — et
 * ne menait à rien depuis le début du projet : un contrôle d'accès sur une page
 * absente, c'est-à-dire une redirection vers une 404.
 *
 * Le contrôle est refait ici, et ce n'est pas une redondance. Le proxy filtre
 * sur un chemin, à partir d'une expression régulière de `matcher` : un
 * changement de préfixe, une route déplacée, et la page s'ouvrirait à tous sans
 * que rien ne le signale. Une page réservée doit dire elle-même à qui elle
 * s'adresse.
 */
export default async function JournalAuditPage() {
  const session = await auth()

  if (session?.user?.role !== "ADMINISTRATEUR") {
    redirect("/dashboard")
  }

  return (
    <>
      <ActeurJournal email={session?.user?.email ?? null} />
      <JournalClient />
    </>
  )
}
