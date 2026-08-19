import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { HydratationModifications } from "@/components/hydratation-modifications";

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
    /*
      La console assume une palette unique, sombre : `dark` et `colorScheme`
      sont posés ici une fois pour toutes, et non pilotés par une préférence.
      C'est une décision, pas un provisoire — voir ADR-030. `colorScheme`
      importe autant que la classe : sans lui, les éléments dessinés par le
      navigateur (barres de défilement, sélecteurs de date, remplissage
      automatique des champs) restent clairs sur une interface sombre.
    */
    <html 
      lang="fr" 
      className={cn("dark", geistSans.variable, geistMono.variable)}
      style={{ colorScheme: "dark" }}
    >
      <body className="bg-background text-foreground antialiased font-sans">
        {/*
          Restitue les modifications de la session précédente une fois le
          navigateur en main. Ne rend rien — voir le commentaire du composant.
        */}
        <HydratationModifications />
        {children}
        {/*
          Point de sortie des notifications. Le composant existait déjà mais
          n'était monté nulle part : aucun `toast()` ne pouvait s'afficher.
          Le thème n'est plus passé d'ici : le composant le fixe lui-même sur
          la seule palette de la console.
        */}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
