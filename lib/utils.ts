import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateString: string | null) => {
  if (!dateString) return "TBD"
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export const formatDateTime = (dateString: string | null, timeString: string | null) => {
  if (!dateString) return "TBD"
  const date = new Date(dateString)
  if (timeString) {
    // If we have a time string, try to combine it
    const timeParts = timeString.split(':')
    if (timeParts.length >= 2) {
      date.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]))
    }
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export const formatCurrency = (amount: string | number | null) => {
  if (!amount) return "$0"
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return "$0"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}

export const formatNumber = (num: string | number | null) => {
  if (!num) return "0"
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(numValue)) return "0"
  return new Intl.NumberFormat("en-US").format(numValue)
}
