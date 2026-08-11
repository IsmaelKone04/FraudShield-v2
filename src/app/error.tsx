"use client"

import { useEffect } from "react"
import { AlertTriangleIcon, RotateCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Filet de sécurité du rendu.
 *
 * Sans ce fichier, la moindre erreur — service de détection injoignable, charge
 * utile non conforme au contrat — se traduisait par une page d'erreur brute du
 * serveur. On affiche désormais quelque chose d'intelligible, avec de quoi
 * réessayer.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // En production, c'est ici qu'un collecteur d'erreurs serait branché.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg border-border bg-card">
        <CardHeader className="space-y-1">
          <div className="flex justify-center py-2">
            <AlertTriangleIcon className="size-10 text-destructive" />
          </div>
          <CardTitle className="text-center text-xl">
            Cet écran n&apos;a pas pu être chargé
          </CardTitle>
          <CardDescription className="text-center">
            Les données n&apos;ont pas pu être récupérées. Si le problème persiste,
            vérifiez que le service de détection répond et que son format
            correspond au contrat attendu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-xs break-words text-muted-foreground">
            {error.message || "Erreur inconnue"}
            {error.digest && (
              <>
                <br />
                <span className="opacity-60">référence : {error.digest}</span>
              </>
            )}
          </p>
          <Button onClick={reset} className="w-full">
            <RotateCwIcon className="size-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
