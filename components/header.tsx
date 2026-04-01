"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/ui/mode-toggle"

export function Header() {
  return (
    <header className="border-b">
      <div className="w-full flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            Polybaskets
          </Link>
          <span className="text-sm font-medium text-muted-foreground">NBA</span>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
