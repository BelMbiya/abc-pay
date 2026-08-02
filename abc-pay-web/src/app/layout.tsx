import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CurrencyBootstrap } from "@/components/CurrencyBootstrap";

// Titres = Sora ; texte = Inter (cf. design system du MVP).
// next/font auto-héberge les polices : aucune requête externe (privacy + CSP).
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "abc pay",
  description: "The Connected Money — paiements du quotidien en RDC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CurrencyBootstrap />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
