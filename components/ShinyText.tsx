"use client"

import type { CSSProperties, FC } from "react"

interface ShinyTextProps {
  text: string
  disabled?: boolean
  speed?: number // Higher number = slower animation
  className?: string
}

const ShinyText: FC<ShinyTextProps> = ({ text, disabled = false, speed = 8, className = "" }) => {
  const animationDuration = `${speed}s`

  return (
    <div
      className={`inline-block ${className}`}
      style={
        {
          "--animation-duration": animationDuration,
        } as CSSProperties
      }
    >
      <div
        className={`relative inline-block ${
          disabled
            ? ""
            : "bg-gradient-to-r from-transparent via-white/80 to-transparent bg-[length:200%_100%] bg-clip-text text-transparent animate-shine"
        }`}
      >
        {text}
      </div>
    </div>
  )
}

export default ShinyText
