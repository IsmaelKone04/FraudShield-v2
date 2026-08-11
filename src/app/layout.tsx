import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

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
      </body>
    </html>
  );
}
