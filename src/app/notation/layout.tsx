import type { ReactNode } from "react"

import { CoqueConsole } from "@/components/coque-console"

/** La notation est servie dans le cadre commun : barre latérale, en-tête, fil d'Ariane. */
export default function Layout({ children }: { children: ReactNode }) {
  return <CoqueConsole>{children}</CoqueConsole>
}
