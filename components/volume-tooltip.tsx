"use client"

import { Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function VolumeTooltip() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Total Volume</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Total Volume represents the total dollar value of shares bought and sold across all markets traded by this user. It is calculated as the sum of all trade amounts (price x quantity) for both buy and sell transactions.
        </p>
      </DialogContent>
    </Dialog>
  )
}
