"use client"

import { useState } from "react"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { USE_MOCK } from "@/lib/api/client"
import { useModificationsStore } from "@/lib/store"
import { COMPTES, nomDuCompte } from "@/lib/utilisateurs"
import { cn } from "@/lib/utils"

/**
 * Assigne une alerte ou un dossier à l'un des comptes de la console.
 *
 * Les rôles étaient portés par le jeton depuis le début et ne conditionnaient
 * rien. C'est le premier écran où l'identité connectée sert à quelque chose : le
 * filtre « Mes dossiers » de la liste s'appuie sur ce champ.
 *
 * Une seule différence entre les deux cibles, et elle vient du contrat : une
 * alerte peut n'être assignée à personne, un dossier est toujours assigné.
 */

/** Valeur du choix « personne » — un `Select` ne peut pas porter `null` comme valeur. */
const AUCUN = "__aucun__"

type Cible = "alerte" | "investigation"

const LIBELLE: Record<Cible, { article: string; role: string }> = {
  alerte: { article: "l'alerte", role: "Analyste en charge de" },
  investigation: { article: "le dossier", role: "Agent en charge du" },
}

export function SelecteurAssignation({
  id,
  assigneA,
  cible = "alerte",
  className,
}: {
  id: string
  /** `null` n'est accepté que pour une alerte. */
  assigneA: string | null
  cible?: Cible
  className?: string
}) {
  const assignerAlerte = useModificationsStore((etat) => etat.assignerAlerte)
  const assignerInvestigation = useModificationsStore(
    (etat) => etat.assignerInvestigation
  )
  const [enCours, setEnCours] = useState(false)

  const estAlerte = cible === "alerte"
  const { article, role } = LIBELLE[cible]

  async function choisir(valeur: string | null) {
    if (valeur === null) return
    const destinataire = valeur === AUCUN ? null : valeur
    if (destinataire === assigneA) return

    setEnCours(true)
    try {
      // `assigneA` est l'affectation antérieure, que le journal réclame et que
      // le store n'a pas : lui seul l'affiche.
      if (estAlerte) {
        await assignerAlerte(id, destinataire, assigneA)
      } else if (destinataire) {
        await assignerInvestigation(id, destinataire, assigneA)
      }
      toast.success(
        destinataire
          ? `${id} — assigné${estAlerte ? "e" : ""} à ${nomDuCompte(destinataire)}`
          : `${id} — assignation retirée`,
        {
          description: USE_MOCK
            ? "Enregistré dans ce navigateur uniquement (mode démonstration)."
            : undefined,
        }
      )
    } catch (erreur) {
      toast.error(`${id} — assignation refusée`, {
        description:
          erreur instanceof Error
            ? erreur.message
            : "L'assignation précédente a été rétablie.",
      })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Select
      value={assigneA ?? AUCUN}
      onValueChange={choisir}
      disabled={enCours}
    >
      <SelectTrigger
        size="sm"
        aria-label={`${role} ${article} ${id}`}
        className={cn(
          "h-6 border-transparent px-2 text-[11px]",
          assigneA ? "text-foreground" : "text-muted-foreground-subtle",
          enCours && "opacity-60",
          className
        )}
      >
        {/* La valeur stockée est une adresse ; on affiche le nom du compte. */}
        <SelectValue>
          {(valeur: string) =>
            valeur === AUCUN ? "Non assignée" : nomDuCompte(valeur)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Retirer l'assignation d'un dossier violerait son contrat de données. */}
        {estAlerte && (
          <SelectItem value={AUCUN} className="text-xs text-muted-foreground">
            Non assignée
          </SelectItem>
        )}
        {COMPTES.map((compte) => (
          <SelectItem key={compte.email} value={compte.email} className="text-xs">
            {compte.nom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
