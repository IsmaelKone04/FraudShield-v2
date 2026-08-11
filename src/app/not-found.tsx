import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Page introuvable" }

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center py-2">
            <FileQuestionIcon className="size-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Page introuvable</CardTitle>
          <CardDescription>
            Cette adresse ne correspond à aucun écran de la console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Base UI compose via `render`, non via `asChild`. */}
          <Button render={<Link href="/dashboard" />} className="w-full">
            Retour au tableau de bord
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
