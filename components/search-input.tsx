"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { searchUsers } from '@/lib/polymarket-client'
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SearchComponentProps {
  placeholder?: string
  className?: string
  size?: "default" | "large"
  onSelectUser?: (userId: string, name: string) => void
}

export function SearchComponent({ placeholder = "Search Polymarket users...", className = "", size = "default", onSelectUser }: SearchComponentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any>({ profiles: [] })
  const [showResults, setShowResults] = useState(false)
  const [justSelected, setJustSelected] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ profiles: [] })
      setShowResults(false)
      return
    }

    try {
      const data = await searchUsers(query)
      setSearchResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults({ profiles: [] })
    }
  }

  useEffect(() => {
    if (justSelected) return
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, justSelected])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (profile: any) => {
    setJustSelected(true)
    setShowResults(false)
    setSearchQuery(profile.name || "")
    onSelectUser?.(profile.proxyWallet, profile.name || profile.proxyWallet)
    router.push(`/${profile.proxyWallet}`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJustSelected(false)
    setSearchQuery(e.target.value)
  }

  const isLarge = size === "large"

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground ${isLarge ? 'h-5 w-5' : 'h-4 w-4'}`} />
        <Input
          type="text"
          placeholder={placeholder}
          className={`pl-10 pr-4 ${isLarge ? 'h-14 text-lg rounded-xl' : ''}`}
          value={searchQuery}
          onChange={handleInputChange}
        />
      </div>

      {showResults && searchResults.profiles?.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">Users</div>
            {searchResults.profiles.map((profile: any, index: number) => (
              <button
                key={profile.proxyWallet || profile.name || `profile-${index}`}
                onClick={() => handleSelect(profile)}
                className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded w-full text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.image} />
                  <AvatarFallback className="text-xs">
                    {profile.name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{profile.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
