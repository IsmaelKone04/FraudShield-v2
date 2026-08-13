import { ApiError, chargerMock, fetchFromAPI, USE_MOCK } from "@/lib/api/client"
import {
  qualiteDataSchema,
  type PeriodeQualite,
  type QualiteData,
} from "@/lib/schemas/qualite.schema"

const ORIGINE = "qualite/data.json"

/**
 * La qualité du modèle, telle qu'elle se mesure sur les dossiers refermés.
 *
 * Le service ne renvoie que des comptages : les taux se calculent dans
 * `lib/qualite.ts`, à partir d'eux. Servir un taux tout fait ferait cohabiter
 * deux vérités — celle du tableau et celle de l'en-tête — et elles finiraient
 * par ne plus dire la même chose.
 */
export const qualiteService = {
  async getQualite(): Promise<QualiteData> {
    const donnees = USE_MOCK
      ? await chargerMock(
          () => import("@/app/qualite/data.json"),
          qualiteDataSchema,
          ORIGINE
        )
      : await fetchFromAPI("/qualite", qualiteDataSchema)

    return verifierCouverture(verifierCases(donnees))
  },
}

/**
 * Vérifie que chaque case totalise ce qu'elle annonce.
 *
 * Deux règles, qu'aucun schéma ne peut porter : les trois issues doivent
 * redonner le nombre de dossiers clos, et la répartition par cause doit
 * redonner le nombre de faux positifs. Chaque champ est valide isolément, et
 * pourtant l'écran afficherait un registre qui ne correspond pas à la courbe
 * juste au-dessus — une mesure fausse est pire qu'une mesure absente, parce
 * qu'on décide dessus. Même raisonnement qu'aux ADR-010, ADR-011 et ADR-014.
 */
function verifierCases(donnees: QualiteData): QualiteData {
  for (const periode of donnees.periodes) {
    const issues =
      periode.confirmes + periode.fauxPositifs + periode.nonConcluants
    if (issues !== periode.clos) {
      throw new ApiError(situer(periode, `${issues} dossiers répartis pour ${periode.clos} clos`), ORIGINE)
    }

    const causes = new Set<string>()
    let somme = 0
    for (const ligne of periode.fauxPositifsParCause) {
      if (causes.has(ligne.cause)) {
        throw new ApiError(situer(periode, `la cause « ${ligne.cause} » est comptée deux fois`), ORIGINE)
      }
      causes.add(ligne.cause)
      somme += ligne.quantite
    }

    if (somme !== periode.fauxPositifs) {
      throw new ApiError(
        situer(periode, `${somme} faux positifs répartis par cause pour ${periode.fauxPositifs} constatés`),
        ORIGINE
      )
    }
  }
  return donnees
}

/**
 * Vérifie qu'aucun type de fraude ne circule sans seuil de dérive.
 *
 * Un type mesuré sans seuil ne déclencherait jamais de bandeau : le modèle
 * pourrait décrocher dessus sans que rien ne le dise. C'est le silence qui est
 * dangereux ici, pas l'erreur.
 */
function verifierCouverture(donnees: QualiteData): QualiteData {
  const avecSeuil = new Set(donnees.seuils.map((seuil) => seuil.typeFraude))

  for (const periode of donnees.periodes) {
    if (!avecSeuil.has(periode.typeFraude)) {
      throw new ApiError(
        `« ${periode.typeFraude} » est mesuré sans seuil de dérive : aucune ` +
          `alerte ne serait levée si le modèle décrochait dessus — ${ORIGINE}`,
        ORIGINE
      )
    }
  }

  for (const etablissement of donnees.etablissementsBruyants) {
    if (etablissement.fauxPositifs > etablissement.alertes) {
      throw new ApiError(
        `${etablissement.nom} : ${etablissement.fauxPositifs} faux positifs ` +
          `pour ${etablissement.alertes} alertes levées — ${ORIGINE}`,
        ORIGINE
      )
    }
  }

  return donnees
}

const situer = (periode: PeriodeQualite, probleme: string) =>
  `${periode.moisLibelle}, ${periode.typeFraude} : ${probleme} — ${ORIGINE}`
