import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "./providers";

// Import Boosted styles directly from the installed npm package
import "boosted/dist/css/boosted.min.css";
import "boosted/dist/css/orange-helvetica.min.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Orange Email Assistant - Votre assistant intelligent",
  description: "Assistant intelligent pour la gestion des emails et réunions",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers> {/* Wrap everything in the Session Provider */}
          <ThemeProvider>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            <Analytics />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

