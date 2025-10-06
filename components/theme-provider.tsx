"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  // This function applies the theme to the document for both Boosted and Tailwind
  const applyTheme = (themeValue: Theme) => {
    // 1. For Tailwind/Shadcn UI (which uses the 'dark' class)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(themeValue)
    
    // 2. For Boosted/Bootstrap (which uses the data-bs-theme attribute)
    document.documentElement.setAttribute("data-bs-theme", themeValue)
  }

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("orange-theme") as Theme | null
    const initialTheme = savedTheme || "light"
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("orange-theme", newTheme)
    applyTheme(newTheme)
  }

  if (!mounted) {
    // Avoid rendering children until the theme is mounted to prevent hydration mismatch
    return null;
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
