"use client"

import { Mail, Sparkles } from "lucide-react"

export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="animate-fade-in flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative">
          <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Mail className="w-12 h-12 text-primary-foreground" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center animate-pulse-orange">
            <Sparkles className="w-4 h-4 text-foreground" />
          </div>
        </div>

        {/* App Name */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Orange <span className="text-primary">Assistant</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md text-balance">
            Votre assistant intelligent pour la gestion des emails et réunions
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex gap-2 mt-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
      </div>

      {/* Orange branding footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by <span className="text-primary font-semibold">Orange</span>
        </p>
      </div>
    </div>
  )
}
