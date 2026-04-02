"use client"

interface AdBannerProps {
  position: 'header' | 'sidebar'
  className?: string
}

const SIZES = {
  header: { width: 728, height: 90 },
  sidebar: { width: 160, height: 600 },
}

export function AdBanner({ position, className = "" }: AdBannerProps) {
  const { width, height } = SIZES[position]

  return (
    <div
      className={`flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded text-xs text-muted-foreground ${className}`}
      style={{ maxWidth: width, height, width: '100%' }}
    >
      Advertisement
    </div>
  )
}
