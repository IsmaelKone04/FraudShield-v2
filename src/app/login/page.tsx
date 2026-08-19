"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * L'écran de connexion.
 *
 * Trois manques d'accessibilité y avaient été relevés en phase 1, et corrigés
 * ici :
 *
 * - l'échec de connexion était un simple paragraphe. Un lecteur d'écran ne
 *   l'annonçait donc jamais : l'utilisateur restait devant un formulaire qui ne
 *   s'était visiblement rien passé. Il est désormais dans une zone `role="alert"`
 *   permanente — présente même vide, sans quoi son apparition passerait pour
 *   l'arrivée d'un nouvel élément plutôt que pour un message ;
 * - les champs n'annonçaient pas ce qu'ils attendent (`autoComplete`), ce qui
 *   prive du remplissage automatique — un gestionnaire de mots de passe est
 *   aussi une aide à la saisie ;
 * - rien n'empêchait de soumettre deux fois. Le bouton se désactive et le dit,
 *   plutôt que de lancer une seconde authentification pendant la première.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [enCours, setEnCours] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enCours) return
    setError("")
    setEnCours(true)

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError("Identifiants incorrects")
        setEnCours(false)
      } else {
        // On laisse le bouton désactivé : la navigation est en cours, et le
        // réactiver ferait clignoter un formulaire qu'on quitte.
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Une erreur est survenue")
      setEnCours(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center py-2">
            {/* Décoratif : le titre juste en dessous dit déjà de quoi il s'agit. */}
            <ShieldCheckIcon className="size-12 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            FraudShield v2
          </CardTitle>
          <CardDescription>
            Entrez vos accès pour accéder à la console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/*
              La zone existe en permanence, vide tant qu'il n'y a rien à dire :
              une région d'alerte insérée au moment de l'erreur n'est pas
              toujours annoncée, alors qu'une région déjà présente dont le
              contenu change l'est.
            */}
            <p
              role="alert"
              aria-live="assertive"
              className="min-h-5 text-center text-sm font-medium text-destructive"
            >
              {error}
            </p>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="nom@etablissement.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={enCours}
                aria-invalid={error ? true : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={enCours}
                aria-invalid={error ? true : undefined}
              />
            </div>

            <Button
              type="submit"
              disabled={enCours}
              className="w-full bg-primary font-bold text-primary-foreground hover:opacity-90"
            >
              {enCours ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Connexion…
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
