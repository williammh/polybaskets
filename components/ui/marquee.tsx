import { ComponentPropsWithoutRef, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Optional CSS class name to apply custom styles
   */
  className?: string
  /**
   * Whether to reverse the animation direction
   * @default false
   */
  reverse?: boolean
  /**
   * Whether to pause the animation on hover
   * @default false
   */
  pauseOnHover?: boolean
  /**
   * Content to be displayed in the marquee
   */
  children: React.ReactNode
  /**
   * Whether to animate vertically instead of horizontally
   * @default false
   */
  vertical?: boolean
  /**
   * Number of times to repeat the content
   * @default 4
   */
  repeat?: number
  /**
   * Whether the marquee can be dragged by the user
   * @default false
   */
  draggable?: boolean
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  draggable = false,
  ...props
}: MarqueeProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [startPos, setStartPos] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return
    setIsDragging(true)
    setStartPos(vertical ? e.clientY : e.clientX)
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggable) return
    const currentPos = vertical ? e.clientY : e.clientX
    const delta = currentPos - startPos
    setDragOffset(delta)
  }

  const handleMouseUp = () => {
    if (!draggable) return
    setIsDragging(false)
    // Keep the drag offset to maintain position
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!draggable) return
    setIsDragging(true)
    setStartPos(vertical ? e.touches[0].clientY : e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !draggable) return
    const currentPos = vertical ? e.touches[0].clientY : e.touches[0].clientX
    const delta = currentPos - startPos
    setDragOffset(delta)
  }

  const handleTouchEnd = () => {
    if (!draggable) return
    setIsDragging(false)
    // Keep the drag offset to maintain position
  }

  const handleMouseLeave = () => {
    if (!draggable) return
    setIsDragging(false)
    // Keep the drag offset to maintain position even when mouse leaves
  }

  return (
    <div
      ref={containerRef}
      {...props}
      className={cn(
        "group flex [gap:var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
          "cursor-grab": draggable && !isDragging,
          "cursor-grabbing": draggable && isDragging,
          "select-none": draggable,
        },
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragOffset ? (vertical ? `translateY(${dragOffset}px)` : `translateX(${dragOffset}px)`) : undefined,
      }}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
              "animate-marquee flex-row": !vertical && !isDragging,
              "animate-marquee-vertical flex-col": vertical && !isDragging,
              "group-hover:[animation-play-state:paused]": pauseOnHover && !isDragging,
              "[animation-direction:reverse]": reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  )
}
