"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/*
  La console n'a qu'une palette, sombre (voir ADR-030) : les notifications la
  suivent sans avoir à interroger de préférence. Elles lisaient auparavant le
  thème du système via next-themes, ce qui pouvait leur donner un fond clair
  sur une interface, elle, toujours sombre.
*/
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          /*
            Ces quatre variables désignaient les jetons de shadcn (--popover,
            --border, --radius), que ce projet n'a jamais définis : il déclare
            les siens dans le bloc @theme, préfixés --color-. Elles ne
            résolvaient donc rien, et les notifications s'affichaient avec les
            couleurs par défaut de sonner au lieu de celles de la console.
          */
          "--normal-bg": "var(--color-popover)",
          "--normal-text": "var(--color-popover-foreground)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
