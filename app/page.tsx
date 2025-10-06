"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SplashScreen from "@/components/splash-screen"

export default function Home() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setLoading(false)
      router.push("/login")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  if (loading) {
    return <SplashScreen />
  }

  return null
}
