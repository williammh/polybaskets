import { use } from "react"
import { SearchComponent } from "@/components/search-input"
import { UserProfile } from "@/components/user-profile"
import { AdBanner } from "@/components/ad-banner"
import { AdSidebar } from "@/components/ad-sidebar"

interface UserPageProps {
  params: Promise<{
    proxyWallet: string
  }>
}

export default function UserPage({ params }: UserPageProps) {
  const { proxyWallet } = use(params)

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

      {/* User Profile */}
      <div className="w-full max-w-6xl px-4 pb-12">
        <UserProfile userId={proxyWallet} />
      </div>

      {/* Sidebar Ad (desktop only) */}
      <AdSidebar />
    </div>
  )
}
