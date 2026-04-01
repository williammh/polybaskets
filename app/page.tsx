"use client"

import { SearchComponent } from "@/components/search-input"
import { AdBanner } from "@/components/ad-banner"

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-full">
      {/* Header Ad Banner */}
      <div className="w-full flex justify-center py-3 px-4">
        <AdBanner position="header" />
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-2xl px-4 py-6">
        <SearchComponent
          size="large"
          placeholder="Search by Polymarket username or address..."
          className="w-full"
        />
      </div>

      <p className="text-muted-foreground text-sm mt-2">
        Search for any Polymarket user to view their NBA stats
      </p>

      {/* Sidebar Ad (desktop only) */}
      <div className="hidden lg:block fixed right-6 top-1/2 -translate-y-1/2">
        <AdBanner position="sidebar" />
      </div>
    </div>
  )
}
