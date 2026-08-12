/**
 * Les comptes de la console.
 *
 * Source unique des identités : `src/auth.ts` y ajoute les empreintes de mots de
 * passe pour l'authentification, et les écrans s'en servent pour l'assignation.
 * Deux listes de comptes finiraient par diverger — c'est déjà arrivé deux fois
 * sur ce projet, sur les alertes (ADR-004) puis sur les dates.
 *
 * Les empreintes ne figurent volontairement pas ici : ce module est importé par
 * des composants clients, donc envoyé au navigateur.
 */
export const COMPTES = [
  {
    id: "USR-001",
    nom: "Diallo Admin",
    email: "admin@fraudshield.com",
    /** Code porté par la session ; c'est lui que `proxy.ts` compare. */
    role: "ADMINISTRATEUR",
    /** Libellé affiché — valeur du champ `role` du contrat `utilisateurSchema`. */
    roleLibelle: "Administrateur",
  },
  {
    id: "USR-002",
    nom: "Ndiaye Super",
    email: "superviseur@fraudshield.com",
    role: "SUPERVISEUR",
    roleLibelle: "Superviseur",
  },
  {
    id: "USR-003",
    nom: "Sow Analyst",
    email: "analyste@fraudshield.com",
    role: "ANALYSTE",
    roleLibelle: "Agent d'analyse",
  },
] as const

export type Compte = (typeof COMPTES)[number]

/** Adresses des comptes, pour vérifier qu'un jeu de données ne s'en écarte pas. */
export const EMAILS_COMPTES: readonly string[] = COMPTES.map((c) => c.email)

/** Nom lisible d'un compte ; à défaut, l'adresse telle quelle. */
export function nomDuCompte(email: string | null | undefined): string {
  if (!email) return "Non assignée"
  return COMPTES.find((compte) => compte.email === email)?.nom ?? email
}

/**
 * Libellé affichable d'un code de rôle porté par la session.
 *
 * La session transporte « ADMINISTRATEUR » — un code de comparaison, pas un mot
 * destiné à être lu. Les écrans passent par ici pour ne pas l'afficher tel quel.
 */
export function libelleDuRole(role: string | null | undefined): string {
  if (!role) return "—"
  return COMPTES.find((compte) => compte.role === role)?.roleLibelle ?? role
}

/** Initiales, pour la pastille affichée dans les tableaux. */
export function initialesDuCompte(email: string | null | undefined): string {
  const nom = COMPTES.find((compte) => compte.email === email)?.nom
  if (!nom) return "—"
  return nom
    .split(" ")
    .map((mot) => mot[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
