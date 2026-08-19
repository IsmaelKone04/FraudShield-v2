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
import { statutAlerteSchema, type StatutAlerte } from "@/lib/schemas/commun"
import { useModificationsStore } from "@/lib/store"
import { cn } from "@/lib/utils"

/**
 * Change le statut d'une alerte depuis la liste.
 *
 * Le statut s'affichait jusqu'ici comme un badge inerte. Il devient le premier
 * point d'écriture de la console : le changement est appliqué immédiatement par
 * le store, et annulé si l'envoi échoue (voir ADR-006).
 */

/** Les trois statuts viennent du schéma : en ajouter un ne se fait qu'à un endroit. */
const STATUTS = statutAlerteSchema.options

const COULEUR_PAR_STATUT: Record<StatutAlerte, string> = {
  "En cours": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "À vérifier": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Résolu: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

export function SelecteurStatut({
  id,
  statut,
  className,
}: {
  id: string
  statut: StatutAlerte
  className?: string
}) {
  const changerStatut = useModificationsStore((etat) => etat.changerStatutAlerte)
  const [enCours, setEnCours] = useState(false)

  // Base UI autorise un `null` (désélection) que ce sélecteur ne propose pas.
  async function choisir(nouveau: StatutAlerte | null) {
    if (nouveau === null || nouveau === statut) return

    setEnCours(true)
    try {
      // Le statut affiché est l'état antérieur : le store ne le connaît pas.
      await changerStatut(id, nouveau, statut)
      toast.success(`${id} — statut « ${nouveau} »`, {
        description: USE_MOCK
          ? "Enregistré dans ce navigateur uniquement (mode démonstration)."
          : undefined,
      })
    } catch (erreur) {
      toast.error(`${id} — changement de statut refusé`, {
        description:
          erreur instanceof Error
            ? erreur.message
            : "Le statut précédent a été rétabli.",
      })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Select value={statut} onValueChange={choisir} disabled={enCours}>
      <SelectTrigger
        size="sm"
        aria-label={`Statut de l'alerte ${id}`}
        className={cn(
          "h-6 gap-1 rounded-full border px-2 text-[10px] font-medium",
          COULEUR_PAR_STATUT[statut],
          enCours && "opacity-60",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUTS.map((valeur) => (
          <SelectItem key={valeur} value={valeur} className="text-xs">
            {valeur}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
