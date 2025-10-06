import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "./providers"; // Import the new provider
import "./globals.css"

export const metadata: Metadata = {
  title: "Orange Email Assistant - Votre assistant intelligent",
  description: "Assistant intelligent pour la gestion des emails et réunions",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/boosted@5.3.5/dist/css/boosted.min.css"
          rel="stylesheet"
          integrity="sha384-VEKxRHlqh5pYLYYQYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYq"
          crossOrigin="anonymous"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/boosted@5.3.5/dist/css/orange-helvetica.min.css"
          rel="stylesheet"
          integrity="sha384-VEKxRHlqh5pYLYYQYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYq"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers> {/* Wrap everything in the Session Provider */}
          <ThemeProvider>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            <Analytics />
          </ThemeProvider>
        </Providers>
        <script
          src="https://cdn.jsdelivr.net/npm/boosted@5.3.5/dist/js/boosted.bundle.min.js"
          integrity="sha384-VEKxRHlqh5pYLYYQYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYqYq"
          crossOrigin="anonymous"
          async
        ></script>
      </body>
    </html>
  )
}
