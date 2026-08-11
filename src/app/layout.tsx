import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "FraudShield — console de détection de fraude",
    template: "%s · FraudShield",
  },
  description:
    "Console de suivi des alertes de fraude à l'assurance santé : détection, " +
    "investigation des dossiers suspects, analyses et rapports.",
  applicationName: "FraudShield",
  // Démonstrateur sur données fictives : aucune raison de le laisser indexer.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="fr" 
      className={cn("dark", geistSans.variable, geistMono.variable)}
      style={{ colorScheme: "dark" }}
    >
      <body className="bg-background text-foreground antialiased font-sans">
        {children}
        {/*
          Point de sortie des notifications. Le composant existait déjà mais
          n'était monté nulle part : aucun `toast()` ne pouvait s'afficher.
          Le thème est figé sur « dark » tant que le sélecteur clair/sombre
          n'est pas en place (phase 5) — sinon les notifications suivraient les
          préférences du système sur une interface, elle, toujours sombre.
        */}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
