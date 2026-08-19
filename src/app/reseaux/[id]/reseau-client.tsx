"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Bell,
  Building2,
  Crosshair,
  Minus,
  Plus,
  Share2,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react"

import { CarteSynthese } from "@/components/carte-synthese"
import { Section } from "@/components/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { francs, separerMilliers } from "@/lib/formats"
import {
  DENSITE_ANORMALE,
  LIENS,
  NOEUDS,
  autourDe,
  montantDuReseau,
  repartition,
  type Graphe,
  type Indicateurs,
} from "@/lib/reseaux"
import {
  COLONNES,
  HAUTEUR,
  LARGEUR,
  ORDRE_COLONNES,
  RAYONS,
} from "@/lib/reseaux-disposition"
import type { Alerte } from "@/lib/schemas/alertes.schema"
import type { Investigation } from "@/lib/schemas/investigations.schema"
import type { Noeud, TypeNoeud } from "@/lib/schemas/reseaux.schema"

type PositionNommee = { id: string; x: number; y: number }

const ZOOM_MIN = 0.6
const ZOOM_MAX = 3

/** Au-delà, le libellé est coupé : il empiéterait sur la colonne voisine. */
const LONGUEUR_LIBELLE = 22

export function ReseauClient({
  graphe,
  positions,
  indicateurs,
  investigation,
  alertes,
  selectionInitiale,
}: {
  graphe: Graphe
  /** Disposition calculée sur le serveur ; le navigateur ne la recalcule pas. */
  positions: PositionNommee[]
  indicateurs: Indicateurs
  investigation: Investigation
  alertes: Alerte[]
  selectionInitiale: string | null
}) {
  const [selection, setSelection] = useState<string | null>(selectionInitiale)
  const [survol, setSurvol] = useState<string | null>(null)
  const [profondeur, setProfondeur] = useState<1 | 2>(1)
  const [zoom, setZoom] = useState(1)
  const [decalage, setDecalage] = useState({ x: 0, y: 0 })

  // Le glissement du cadre et le clic sur un nœud se disputent le même geste :
  // ces deux repères servent à les départager sans capture de pointeur, qui
  // détournerait le clic vers le SVG et empêcherait tout nœud de le recevoir.
  const glisse = useRef<{ x: number; y: number; dx: number; dy: number } | null>(
    null
  )
  const aGlisse = useRef(false)

  const parId = useMemo(
    () => new Map(graphe.noeuds.map((n) => [n.id, n])),
    [graphe.noeuds]
  )
  const coordonnees = useMemo(
    () => new Map(positions.map((p) => [p.id, p])),
    [positions]
  )

  /** Les nœuds mis en évidence : le sélectionné et son voisinage. */
  const evidence = useMemo(
    () => (selection ? autourDe(graphe, selection, profondeur) : null),
    [graphe, selection, profondeur]
  )

  const noeudSelectionne = selection ? parId.get(selection) : undefined
  const compte = repartition(graphe)
  const montant = montantDuReseau(graphe)

  /** Ce à quoi le nœud sélectionné est directement rattaché. */
  const rattachements = useMemo(() => {
    if (!selection) return []
    return graphe.aretes
      .filter((a) => a.source === selection || a.cible === selection)
      .map((a) => {
        const autre = a.source === selection ? a.cible : a.source
        return { lien: LIENS[a.type].libelle, noeud: parId.get(autre)! }
      })
      .filter((r) => r.noeud)
      .sort((a, b) => a.noeud.libelle.localeCompare(b.noeud.libelle))
  }, [graphe.aretes, parId, selection])

  const alerteDuNoeud =
    noeudSelectionne?.type === "sinistre" && noeudSelectionne.alerteId
      ? alertes.find((a) => a.id === noeudSelectionne.alerteId)
      : undefined

  const recadrer = () => {
    setZoom(1)
    setDecalage({ x: 0, y: 0 })
  }

  // Le cadrage passe par le `viewBox` : le repère du dessin reste celui du
  // serveur, et les coordonnées écrites dans le HTML ne changent jamais.
  const largeurVue = LARGEUR / zoom
  const hauteurVue = HAUTEUR / zoom
  const vueX = (LARGEUR - largeurVue) / 2 - decalage.x
  const vueY = (HAUTEUR - hauteurVue) / 2 - decalage.y

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href="/reseaux"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Réseaux de fraude
      </Link>

      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {graphe.reseau.titre}
            </h1>
            <Badge variant="outline" className="text-[10px]">
              {investigation.statut}
            </Badge>
            {indicateurs.densiteAnormale && (
              <Badge
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-[10px] text-red-400"
              >
                Densité anormale
              </Badge>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {investigation.description}
          </p>
        </div>
        <Link
          href="/investigations"
          className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          Dossier {investigation.id} →
        </Link>
      </div>

      {/* ── Ce que le graphe ajoute à la fiche ── */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2.5">
        <span className="text-xs text-blue-300">
          Le dossier annonce <strong>{investigation.casLies} cas liés</strong> ;
          le moteur n&apos;en avait signalé que{" "}
          <strong>{investigation.alertesLiees.length}</strong>. Les autres sont
          venus du recoupement — ce sont les losanges creux ci-dessous, et aucun
          écran ne les montrait jusqu&apos;ici.
        </span>
      </div>

      {/* ── Synthèse ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CarteSynthese
          icone={Share2}
          libelle="Sinistres"
          valeur={separerMilliers(compte.sinistre)}
          precision={`${alertes.length} ont déclenché une alerte`}
        />
        <CarteSynthese
          icone={Users}
          libelle="Assurés"
          valeur={separerMilliers(compte.assure)}
          precision={
            indicateurs.assuresPartages.length === 0
              ? "Aucun présent dans deux établissements"
              : `${indicateurs.assuresPartages.length} dans plusieurs établissements`
          }
          accent={
            indicateurs.assuresPartages.length > 0 ? "text-amber-400" : undefined
          }
        />
        <CarteSynthese
          icone={Building2}
          libelle="Montant en jeu"
          valeur={francs(montant)}
          precision={`${compte.etablissement} établissements, ${compte.praticien} praticiens`}
        />
        <CarteSynthese
          icone={TriangleAlert}
          libelle="Densité de liens"
          valeur={indicateurs.densite.toFixed(2).replace(".", ",")}
          precision={`1,00 = aucun partage · alerte à ${DENSITE_ANORMALE.toFixed(2).replace(".", ",")}`}
          accent={indicateurs.densiteAnormale ? "text-red-400" : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        {/* ── Le graphe ── */}
        <Section
          titre="Graphe du réseau"
          icone={Share2}
          compte={`${graphe.noeuds.length} entités · ${graphe.aretes.length} liens`}
          action={
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-[11px]"
                onClick={() => setProfondeur(profondeur === 1 ? 2 : 1)}
                title="Étendue de la mise en évidence autour de l'entité choisie : ses voisins directs, ou les voisins de ses voisins"
              >
                Voisinage {profondeur}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - 0.25))}
                aria-label="Réduire"
              >
                <Minus size={13} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 0.25))}
                aria-label="Agrandir"
              >
                <Plus size={13} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={recadrer}
                aria-label="Recadrer"
                title="Revenir au cadrage d'origine"
              >
                <Crosshair size={13} />
              </Button>
            </div>
          }
        >
          {/* ── Comment lire ce graphe ── */}
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Chaque chaîne se lit <strong>de gauche à droite</strong> : un{" "}
            <Mot type="assure">assuré</Mot> déclare un{" "}
            <Mot type="sinistre">sinistre</Mot>, pris en charge par un{" "}
            <Mot type="praticien">praticien</Mot> et facturé par un{" "}
            <Mot type="etablissement">établissement</Mot>. Un trait est un
            rattachement réel. <strong>Cliquez sur une entité</strong> pour
            n&apos;éclairer que ce qu&apos;elle touche ; le reste est estompé,
            pas retiré.
          </p>

          {/* ── En-têtes de colonnes ──
              En HTML plutôt que dans le SVG : ils restent en place quand on
              déplace ou agrandit le graphe, et se lisent à la sélection. */}
          <div className="relative mb-1 h-5">
            {ORDRE_COLONNES.map((type) => (
              <span
                key={type}
                className="absolute -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  left: `${COLONNES[type] * 100}%`,
                  color: NOEUDS[type].couleur,
                }}
              >
                {NOEUDS[type].pluriel} ({compte[type]})
              </span>
            ))}
          </div>

          <svg
            viewBox={`${vueX} ${vueY} ${largeurVue} ${hauteurVue}`}
            className="w-full cursor-grab touch-none rounded-lg bg-muted/20 active:cursor-grabbing"
            role="img"
            aria-label={`Graphe du réseau ${graphe.reseau.titre} : ${graphe.noeuds.length} entités reliées par ${graphe.aretes.length} liens`}
            onPointerDown={(e) => {
              glisse.current = {
                x: e.clientX,
                y: e.clientY,
                dx: decalage.x,
                dy: decalage.y,
              }
              aGlisse.current = false
            }}
            onPointerMove={(e) => {
              const depart = glisse.current
              if (!depart || (e.buttons & 1) === 0) return
              const bougeX = e.clientX - depart.x
              const bougeY = e.clientY - depart.y
              if (Math.abs(bougeX) + Math.abs(bougeY) > 4) aGlisse.current = true
              // Le pointeur se déplace en pixels d'écran ; le repère du SVG fait
              // 1000 unités de large quel que soit l'espace disponible.
              const echelle = largeurVue / e.currentTarget.clientWidth
              setDecalage({
                x: depart.dx + bougeX * echelle,
                y: depart.dy + bougeY * echelle,
              })
            }}
            onPointerUp={() => (glisse.current = null)}
            onPointerLeave={() => (glisse.current = null)}
            onClick={(e) => {
              // Un glissement se termine par un clic : il ne doit pas
              // désélectionner ce qu'on venait de choisir.
              if (aGlisse.current) {
                aGlisse.current = false
                return
              }
              if (e.target === e.currentTarget) setSelection(null)
            }}
          >
            {graphe.aretes.map((a) => {
              const de = coordonnees.get(a.source)
              const vers = coordonnees.get(a.cible)
              if (!de || !vers) return null
              const mise =
                !evidence || (evidence.has(a.source) && evidence.has(a.cible))
              return (
                <line
                  key={`${a.source}-${a.cible}-${a.type}`}
                  x1={de.x}
                  y1={de.y}
                  x2={vers.x}
                  y2={vers.y}
                  stroke="currentColor"
                  className={
                    mise ? "text-muted-foreground/50" : "text-muted-foreground/5"
                  }
                  strokeWidth={mise ? 1.3 : 1}
                />
              )
            })}

            {graphe.noeuds.map((n) => {
              const p = coordonnees.get(n.id)
              if (!p) return null
              const mise = !evidence || evidence.has(n.id)
              const choisi = n.id === selection
              const signale = n.type === "sinistre" && n.alerteId !== null
              const rayon = RAYONS[n.type] + (choisi ? 4 : 0)
              // Les sinistres sont trop nombreux pour porter tous un libellé :
              // le leur n'apparaît qu'à la sélection, au survol, ou quand la
              // mise en évidence a déjà réduit ce qui est lisible.
              const libelleVisible =
                n.type !== "sinistre" ||
                choisi ||
                survol === n.id ||
                (evidence !== null && evidence.has(n.id))
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className="cursor-pointer"
                  opacity={mise ? 1 : 0.15}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (aGlisse.current) return
                    setSelection(choisi ? null : n.id)
                  }}
                  onPointerEnter={() => setSurvol(n.id)}
                  onPointerLeave={() => setSurvol(null)}
                >
                  <title>{titreNoeud(n)}</title>
                  {/* Cible de clic élargie : un disque de huit unités se rate. */}
                  <circle r={rayon + 10} fill="transparent" />
                  <Forme
                    type={n.type}
                    rayon={rayon}
                    fill={NOEUDS[n.type].couleur}
                    fillOpacity={signale || n.type !== "sinistre" ? 0.85 : 0.12}
                    stroke={choisi ? "#f8fafc" : NOEUDS[n.type].couleur}
                    strokeWidth={choisi ? 2.5 : signale ? 2.2 : 1.4}
                  />
                  {libelleVisible && (
                    <text
                      {...ancrageLibelle(n.type, rayon)}
                      className="pointer-events-none fill-foreground text-[11px]"
                      style={{
                        paintOrder: "stroke",
                        stroke: "var(--card)",
                        strokeWidth: 3.5,
                        strokeLinejoin: "round",
                      }}
                    >
                      {couper(n.libelle)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* ── Légende ── */}
          <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {ORDRE_COLONNES.map((type) => (
                <span
                  key={type}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <svg width={18} height={18} viewBox="-9 -9 18 18">
                    <Forme
                      type={type}
                      rayon={7}
                      fill={NOEUDS[type].couleur}
                      fillOpacity={0.85}
                      stroke={NOEUDS[type].couleur}
                      strokeWidth={1.4}
                    />
                  </svg>
                  {NOEUDS[type].libelle}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg width={18} height={18} viewBox="-9 -9 18 18">
                  <Forme
                    type="sinistre"
                    rayon={7}
                    fill={NOEUDS.sinistre.couleur}
                    fillOpacity={0.85}
                    stroke={NOEUDS.sinistre.couleur}
                    strokeWidth={2.2}
                  />
                </svg>
                Losange plein : le moteur avait signalé ce sinistre
              </span>
              <span className="flex items-center gap-1.5">
                <svg width={18} height={18} viewBox="-9 -9 18 18">
                  <Forme
                    type="sinistre"
                    rayon={7}
                    fill={NOEUDS.sinistre.couleur}
                    fillOpacity={0.12}
                    stroke={NOEUDS.sinistre.couleur}
                    strokeWidth={1.4}
                  />
                </svg>
                Losange creux : venu du recoupement, jamais signalé
              </span>
            </div>
          </div>
        </Section>

        {/* ── Panneau latéral ── */}
        <div className="flex flex-col gap-4">
          <Section titre="Entité choisie" icone={Crosshair}>
            {!noeudSelectionne ? (
              <p className="text-xs text-muted-foreground">
                Cliquez sur une entité du graphe — ou sur un nom dans les
                indicateurs ci-dessous — pour ne garder en évidence que ce
                qu&apos;elle touche.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <svg width={14} height={14} viewBox="-9 -9 18 18">
                      <Forme
                        type={noeudSelectionne.type}
                        rayon={7}
                        fill={NOEUDS[noeudSelectionne.type].couleur}
                        fillOpacity={0.85}
                        stroke={NOEUDS[noeudSelectionne.type].couleur}
                        strokeWidth={1.4}
                      />
                    </svg>
                    <span className="text-sm font-semibold text-foreground">
                      {noeudSelectionne.libelle}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                    {NOEUDS[noeudSelectionne.type].libelle} ·{" "}
                    {noeudSelectionne.id}
                  </p>
                </div>

                {noeudSelectionne.type === "praticien" && (
                  <p className="text-xs text-muted-foreground">
                    Spécialité déclarée : {noeudSelectionne.specialite}
                  </p>
                )}
                {noeudSelectionne.type === "sinistre" && (
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>
                      {noeudSelectionne.montantFormate} ·{" "}
                      {noeudSelectionne.dateFormate}
                    </p>
                    <p>
                      {noeudSelectionne.alerteId
                        ? `Signalé par le moteur (${noeudSelectionne.alerteId})`
                        : "Non signalé — rattaché par recoupement"}
                    </p>
                  </div>
                )}

                {alerteDuNoeud && (
                  <Link
                    href={`/alertes/${alerteDuNoeud.id}`}
                    className="flex w-fit items-center gap-1.5 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                  >
                    <Bell size={12} />
                    Ouvrir le dossier d&apos;alerte
                  </Link>
                )}

                <div className="border-t border-border/40 pt-3">
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                    Rattachements directs ({rattachements.length})
                  </p>
                  <ul className="space-y-1.5">
                    {rattachements.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span
                          className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full"
                          style={{ background: NOEUDS[r.noeud.type].couleur }}
                        />
                        <span className="min-w-0">
                          <span className="text-muted-foreground">
                            {r.lien}{" "}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelection(r.noeud.id)}
                            className="text-left text-foreground underline-offset-2 hover:underline"
                          >
                            {r.noeud.libelle}
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Section>

          <Section titre="Indicateurs de collusion" icone={TriangleAlert}>
            <div className="flex flex-col gap-4">
              <ListeIndicateur
                icone={UserRound}
                titre="Assurés présents dans plusieurs établissements"
                vide="Aucun : chaque assuré ne déclare qu'à un seul endroit."
                entrees={indicateurs.assuresPartages.map((e) => ({
                  id: e.noeud.id,
                  libelle: e.noeud.libelle,
                  detail: e.rattachements.join(" · "),
                  compte: e.rattachements.length,
                }))}
                onChoisir={setSelection}
              />
              <ListeIndicateur
                icone={Users}
                titre="Praticiens présents dans plusieurs dossiers"
                vide="Aucun : les praticiens de ce réseau n'apparaissent nulle part ailleurs."
                entrees={indicateurs.praticiensMultiDossiers.map((e) => ({
                  id: e.noeud.id,
                  libelle: e.noeud.libelle,
                  detail: e.rattachements.join(" · "),
                  compte: e.rattachements.length,
                }))}
                onChoisir={setSelection}
              />
              <ListeIndicateur
                icone={Building2}
                titre="Entités portant plusieurs sinistres"
                vide="Aucune : chaque entité ne porte qu'un sinistre."
                entrees={indicateurs.concentration.slice(0, 6).map((e) => ({
                  id: e.noeud.id,
                  libelle: e.noeud.libelle,
                  detail: NOEUDS[e.noeud.type].libelle,
                  compte: e.sinistres,
                }))}
                onChoisir={setSelection}
              />
            </div>
          </Section>

          {alertes.length > 0 && (
            <Section
              titre="Alertes du périmètre"
              icone={Bell}
              compte={`${alertes.length} sur ${compte.sinistre} sinistres`}
            >
              <ul className="space-y-2">
                {alertes.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/alertes/${a.id}`}
                      className="flex items-center justify-between gap-2 text-xs transition-colors hover:text-foreground"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        <span className="font-mono text-foreground">{a.id}</span>{" "}
                        · {a.type}
                      </span>
                      <span className="shrink-0 text-muted-foreground/70">
                        {a.scoreIA}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Une forme par type d'entité.
 *
 * La couleur seule ne suffit pas : elle disparaît pour un daltonien, à
 * l'impression, et sur une capture d'écran. Quatre silhouettes distinctes se
 * lisent dans tous les cas.
 */
function Forme({
  type,
  rayon: r,
  ...props
}: { type: TypeNoeud; rayon: number } & React.SVGProps<
  SVGCircleElement & SVGRectElement & SVGPolygonElement
>) {
  if (type === "etablissement")
    return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2} {...props} />
  if (type === "praticien")
    return (
      <polygon
        points={`0,${-r * 1.2} ${r * 1.05},${r * 0.75} ${-r * 1.05},${r * 0.75}`}
        {...props}
      />
    )
  if (type === "sinistre")
    return (
      <polygon points={`0,${-r * 1.2} ${r * 1.2},0 0,${r * 1.2} ${-r * 1.2},0`} {...props} />
    )
  return <circle r={r} {...props} />
}

/**
 * Où écrire le libellé d'un nœud, selon sa colonne.
 *
 * Les assurés sont à gauche du dessin : leur nom part vers l'extérieur, du côté
 * où il ne rencontre aucun lien. Les praticiens et les établissements font de
 * même vers la droite. Seuls les sinistres, au milieu, écrivent sous le nœud.
 */
function ancrageLibelle(type: TypeNoeud, rayon: number) {
  if (type === "assure")
    return { x: -rayon - 7, y: 4, textAnchor: "end" as const }
  if (type === "sinistre")
    return { x: 0, y: rayon + 15, textAnchor: "middle" as const }
  return { x: rayon + 7, y: 4, textAnchor: "start" as const }
}

const couper = (texte: string) =>
  texte.length > LONGUEUR_LIBELLE
    ? `${texte.slice(0, LONGUEUR_LIBELLE - 1)}…`
    : texte

/** Un mot de la phrase de lecture, teinté comme sa colonne. */
function Mot({
  type,
  children,
}: {
  type: TypeNoeud
  children: React.ReactNode
}) {
  return (
    <strong style={{ color: NOEUDS[type].couleur }} className="font-semibold">
      {children}
    </strong>
  )
}

/** Une liste d'indicateur, ou la phrase qui dit qu'il n'y en a pas. */
function ListeIndicateur({
  icone: Icone,
  titre,
  vide,
  entrees,
  onChoisir,
}: {
  icone: React.ComponentType<{ size?: number; className?: string }>
  titre: string
  /** Ce qui s'affiche quand la liste est vide — jamais un blanc. */
  vide: string
  entrees: { id: string; libelle: string; detail: string; compte: number }[]
  onChoisir: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icone size={13} className="text-muted-foreground/70" />
        <span className="text-[11px] font-medium text-muted-foreground">
          {titre}
        </span>
      </div>
      {entrees.length === 0 ? (
        <p className="text-xs text-muted-foreground/60">{vide}</p>
      ) : (
        <ul className="space-y-2">
          {entrees.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onChoisir(e.id)}
                className="w-full text-left"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-foreground">
                    {e.libelle}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {e.compte}
                  </Badge>
                </div>
                <div className="truncate text-[10px] text-muted-foreground/60">
                  {e.detail}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** L'infobulle native du SVG : lisible sans JavaScript, et par un lecteur d'écran. */
function titreNoeud(n: Noeud): string {
  if (n.type === "sinistre")
    return `${n.libelle} — ${n.montantFormate}, ${n.dateFormate}${
      n.alerteId ? ` (alerte ${n.alerteId})` : ""
    }`
  if (n.type === "praticien") return `${n.libelle} — ${n.specialite}`
  return `${n.libelle} — ${NOEUDS[n.type].libelle}`
}
