"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { USE_MOCK } from "@/lib/api/client"
import { DECISIONS } from "@/lib/decisions"
import {
  attenuants,
  facteursTries,
  phraseExplicative,
  rapportCohorte,
} from "@/lib/explication"
import {
  ecartRelatif,
  formaterHorodatage,
  francs,
  signe,
  valeurAvecUnite,
} from "@/lib/formats"
import type { AlerteDetail } from "@/lib/schemas/alertes.schema"
import { useAlerteDetail } from "@/lib/store"
import { nomDuCompte } from "@/lib/utilisateurs"

/**
 * La note d'explication, telle qu'elle sortira de l'imprimante.
 *
 * Rendue en clair alors que la console est sombre, et c'est voulu : la page
 * affichée est **exactement** la page imprimée. Une note noire à l'écran qu'une
 * feuille de style redresserait au moment d'imprimer se découvrirait cassée
 * après coup, sur du papier.
 *
 * Aucune bibliothèque de génération de PDF n'est embarquée. Le navigateur en
 * produit un, fidèle et sélectionnable, par « Enregistrer au format PDF » ;
 * ajouter 500 ko de dépendance pour refaire moins bien ce qu'il fait déjà ne se
 * justifierait pas. Ce que cela coûte est écrit dans l'ADR-016.
 */
export function NoteClient({
  dossier: dossierServeur,
  utilisateur,
  editeeLe,
}: {
  dossier: AlerteDetail
  utilisateur: string | null
  editeeLe: string
}) {
  const dossier = useAlerteDetail(dossierServeur)
  const facteurs = facteursTries(dossier.explication)
  const enFaveur = attenuants(dossier.explication)

  return (
    <div className="min-h-svh bg-neutral-200 py-8 print:bg-white print:py-0">
      {/* ── Barre de commandes — absente du papier ── */}
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Button
          size="sm"
          variant="ghost"
          render={<Link href={`/alertes/${dossier.id}`} />}
          className="gap-1.5"
        >
          <ArrowLeft size={13} />
          Retour au dossier
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            Dans la fenêtre d&apos;impression, choisir « Enregistrer au format
            PDF » pour joindre la note au dossier.
          </span>
          <Button size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer size={13} />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* ── La feuille ── */}
      <article
        id="note-explication"
        lang="fr"
        className="mx-auto max-w-[210mm] bg-white px-10 py-10 text-[13px] leading-relaxed text-neutral-900 shadow-lg print:max-w-none print:px-0 print:py-0 print:shadow-none"
      >
        {USE_MOCK && (
          <p className="mb-6 border-l-4 border-neutral-900 bg-neutral-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
            Démonstration — données fictives, sans valeur probante
          </p>
        )}

        <header className="mb-8 border-b-2 border-neutral-900 pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-bold">Note d&apos;explication</h1>
            <span className="font-mono text-sm">{dossier.id}</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-600">
            FraudShield — cellule de détection de fraude · Éditée le{" "}
            {formaterHorodatage(editeeLe)}
            {utilisateur ? ` par ${nomDuCompte(utilisateur)}` : ""}
          </p>
        </header>

        {/* ── Objet ── */}
        <Bloc titre="Objet">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <Ligne intitule="Motif du signalement" valeur={dossier.type} />
            <Ligne
              intitule="Assuré"
              valeur={`${dossier.assure} — ${dossier.assureRef}, contrat ${dossier.contratRef}`}
            />
            <Ligne
              intitule="Établissement"
              valeur={`${dossier.etablissement} — ${dossier.etablissementRef}`}
            />
            <Ligne intitule="Praticien" valeur={dossier.praticien} />
            <Ligne
              intitule="Montant réclamé"
              valeur={`${dossier.montantFormate} · ${dossier.actes.length} acte${dossier.actes.length > 1 ? "s" : ""}`}
            />
            <Ligne intitule="Date du signalement" valeur={dossier.dateFormate} />
          </dl>
        </Bloc>

        {/* ── 1. Le score et sa décomposition ── */}
        <Bloc titre={`1. Score de risque : ${dossier.scoreIA} / 100`}>
          <p className="mb-4">
            {phraseExplicative(dossier.scoreIA, dossier.explication)}
          </p>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-y border-neutral-400 text-left">
                <th scope="col" className="py-1.5 pr-3 font-semibold">Facteur</th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">Observé</th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">Attendu</th>
                <th scope="col" className="py-1.5 text-right font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200">
                <td className="py-1.5 pr-3 italic" colSpan={3}>
                  Valeur de base — score moyen de l&apos;ensemble des demandes
                  analysées
                </td>
                <td className="py-1.5 text-right font-mono">
                  {dossier.explication.valeurDeBase}
                </td>
              </tr>
              {facteurs.map((facteur) => (
                <tr key={facteur.code} className="border-b border-neutral-200 align-top">
                  <td className="py-1.5 pr-3">
                    {facteur.libelle}
                    <div className="text-[10px] text-neutral-500">
                      Source : {facteur.source}
                    </div>
                  </td>
                  <td className="py-1.5 pr-3">{facteur.valeurObservee}</td>
                  <td className="py-1.5 pr-3">{facteur.valeurAttendue}</td>
                  <td className="py-1.5 text-right font-mono font-semibold">
                    {signe(facteur.contribution)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b-2 border-neutral-900">
                <td className="py-1.5 pr-3 font-semibold" colSpan={3}>
                  Score retenu
                </td>
                <td className="py-1.5 text-right font-mono font-bold">
                  {dossier.scoreIA}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-2 text-[10px] text-neutral-500">
            {dossier.explication.modele}, calculé le{" "}
            {formaterHorodatage(dossier.explication.calculeLe)}. Les
            contributions s&apos;ajoutent à la valeur de base et totalisent le
            score retenu.
            {enFaveur.length > 0 &&
              ` ${enFaveur.length} facteur${enFaveur.length > 1 ? "s jouent" : " joue"} en faveur du dossier.`}
          </p>
        </Bloc>

        {/* ── 2. Actes facturés ── */}
        <Bloc titre="2. Actes facturés et tarifs de référence">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-y border-neutral-400 text-left">
                <th scope="col" className="py-1.5 pr-3 font-semibold">Code</th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">Acte</th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">Date</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Qté</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Facturé</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Référence</th>
                <th scope="col" className="py-1.5 text-right font-semibold">Écart</th>
              </tr>
            </thead>
            <tbody>
              {dossier.actes.map((acte, rang) => (
                <tr
                  key={`${acte.code}-${acte.date}-${rang}`}
                  className="border-b border-neutral-200 align-top"
                >
                  <td className="py-1.5 pr-3 font-mono">{acte.code}</td>
                  <td className="py-1.5 pr-3">
                    {acte.libelle}
                    {acte.signal && (
                      <div className="text-[10px] text-neutral-600">
                        Constat : {acte.signal}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3">{acte.dateFormate}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{acte.quantite}</td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-right font-mono">
                    {acte.montantFormate}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-right font-mono">
                    {francs(acte.tarifReference)}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right font-mono">
                    {acte.montant === acte.tarifReference
                      ? "—"
                      : `+${francs(acte.montant - acte.tarifReference)}`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b-2 border-neutral-900 font-semibold">
                <td className="py-1.5 pr-3" colSpan={4}>Total</td>
                <td className="whitespace-nowrap py-1.5 pr-3 text-right font-mono">
                  {francs(dossier.montant)}
                </td>
                <td className="whitespace-nowrap py-1.5 pr-3 text-right font-mono">
                  {francs(totalReference(dossier))}
                </td>
                <td className="whitespace-nowrap py-1.5 text-right font-mono">
                  +{francs(dossier.montant - totalReference(dossier))}
                </td>
              </tr>
            </tfoot>
          </table>
        </Bloc>

        {/* ── 3. Éléments de comparaison ── */}
        <Bloc titre="3. Éléments de comparaison">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-y border-neutral-400 text-left">
                <th scope="col" className="py-1.5 pr-3 font-semibold">Référence</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Ce dossier</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Moyenne</th>
                <th scope="col" className="py-1.5 text-right font-semibold">Écart</th>
              </tr>
            </thead>
            <tbody>
              {dossier.comparatifs.map((c) => (
                <tr key={`${c.cohorte}-${c.libelle}`} className="border-b border-neutral-200 align-top">
                  <td className="py-1.5 pr-3">
                    {c.libelle}
                    <div className="text-[10px] text-neutral-500">
                      {c.cohorte} · {c.effectif}
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-right font-mono">
                    {valeurAvecUnite(c.valeurDossier, c.unite)}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-right font-mono">
                    {valeurAvecUnite(c.valeurCohorte, c.unite)}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right font-mono">
                    {ecartRelatif(c.valeurDossier, c.valeurCohorte) ?? "—"}
                    <div className="text-[10px] font-sans text-neutral-500">
                      {rapportCohorte(c)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloc>

        {/* ── 4. Décision ── */}
        <Bloc titre="4. Décision de la cellule">
          {dossier.decision ? (
            <>
              <p>
                <strong>{DECISIONS[dossier.decision.type].resume}</strong> —{" "}
                {dossier.decision.motif}
              </p>
              <p className="mt-3 text-[11px] text-neutral-600">
                {nomDuCompte(dossier.decision.acteur)}, le{" "}
                {formaterHorodatage(dossier.decision.horodatage)}. Statut du
                dossier avant décision : {dossier.decision.statutAnterieur}.
              </p>
            </>
          ) : (
            <p className="text-neutral-600">
              Aucune décision n&apos;a été arrêtée à ce jour. Le dossier est au
              statut « {dossier.statut} ».
            </p>
          )}
        </Bloc>

        <footer className="mt-10 border-t border-neutral-300 pt-3 text-[10px] text-neutral-500">
          Note produite automatiquement à partir des éléments du dossier{" "}
          {dossier.id}. Les tarifs de référence sont ceux de la nomenclature en
          vigueur. Toute contestation doit être adressée à la cellule de
          détection de fraude en citant la référence du dossier.
        </footer>
      </article>
    </div>
  )
}

function totalReference(dossier: AlerteDetail): number {
  return dossier.actes.reduce((somme, acte) => somme + acte.tarifReference, 0)
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    // `break-inside-avoid` : une section coupée en deux par un saut de page se
    // relit mal, et une note de contestation se lit une fois.
    <section className="mb-7 break-inside-avoid">
      <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide">
        {titre}
      </h2>
      {children}
    </section>
  )
}

function Ligne({ intitule, valeur }: { intitule: string; valeur: string }) {
  return (
    <>
      <dt className="whitespace-nowrap text-neutral-600">{intitule}</dt>
      <dd>{valeur}</dd>
    </>
  )
}
