"use client"

import { useEffect, useState } from "react"
import { AdBanner } from "@/components/ad-banner"

const MIN_WIDTH = 1400

export function AdSidebar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => setVisible(window.innerWidth >= MIN_WIDTH)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

if (!visible) return null

  return (
    <div className="fixed right-1 top-1/2 -translate-y-1/2 w-[160px]">
      <AdBanner position="sidebar" />
    </div>
  )
}
