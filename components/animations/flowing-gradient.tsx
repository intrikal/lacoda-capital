"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// Gradient Blob Component
// ─────────────────────────────────────────────────────────────────────────────

interface GradientBlobProps {
  color: string
  size: number
  initialX: number
  initialY: number
  duration: number
  delay: number
  opacity: number
  blur: number
  reducedMotion: boolean
}

function GradientBlob({
  color,
  size,
  initialX,
  initialY,
  duration,
  delay,
  opacity,
  blur,
  reducedMotion,
}: GradientBlobProps) {
  const style: React.CSSProperties = {
    position: "absolute",
    width: `${size}%`,
    height: `${size}%`,
    left: `${initialX}%`,
    top: `${initialY}%`,
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    opacity,
    filter: `blur(${blur}px)`,
    transform: "translate(-50%, -50%)",
    animation: reducedMotion
      ? "none"
      : `blob-float-${Math.round(initialX)}-${Math.round(initialY)} ${duration}s ease-in-out ${delay}s infinite`,
  }

  return <div style={style} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Flowing Gradient Component
// ─────────────────────────────────────────────────────────────────────────────

interface FlowingGradientProps {
  className?: string
}

export function FlowingGradient({ className }: FlowingGradientProps) {
  const reducedMotion = useReducedMotion()
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Blob configurations - teal/cyan palette matching Lacoda brand
  const blobs = React.useMemo(() => [
    // Large primary blobs
    { color: "#14b8a6", size: 80, x: 60, y: 40, duration: 20, delay: 0, opacity: 0.4, blur: 80 },
    { color: "#06b6d4", size: 70, x: 80, y: 60, duration: 25, delay: 2, opacity: 0.35, blur: 90 },
    { color: "#0891b2", size: 60, x: 70, y: 30, duration: 22, delay: 4, opacity: 0.3, blur: 70 },

    // Medium accent blobs
    { color: "#2dd4bf", size: 50, x: 50, y: 70, duration: 18, delay: 1, opacity: 0.35, blur: 60 },
    { color: "#22d3ee", size: 45, x: 90, y: 50, duration: 24, delay: 3, opacity: 0.3, blur: 65 },
    { color: "#5eead4", size: 40, x: 65, y: 80, duration: 20, delay: 5, opacity: 0.25, blur: 55 },

    // Smaller highlight blobs
    { color: "#99f6e4", size: 35, x: 75, y: 25, duration: 16, delay: 2, opacity: 0.3, blur: 45 },
    { color: "#67e8f9", size: 30, x: 85, y: 70, duration: 19, delay: 4, opacity: 0.25, blur: 50 },
    { color: "#a5f3fc", size: 25, x: 55, y: 55, duration: 21, delay: 1, opacity: 0.2, blur: 40 },
  ], [])

  // Generate keyframe animations dynamically
  React.useEffect(() => {
    if (reducedMotion) return

    const styleSheet = document.createElement("style")
    styleSheet.id = "flowing-gradient-animations"

    // Remove existing if present
    const existing = document.getElementById("flowing-gradient-animations")
    if (existing) existing.remove()

    const keyframes = blobs.map((blob) => {
      const keyframeName = `blob-float-${Math.round(blob.x)}-${Math.round(blob.y)}`
      const xRange = 15 + Math.random() * 10
      const yRange = 10 + Math.random() * 10

      return `
        @keyframes ${keyframeName} {
          0%, 100% {
            transform: translate(-50%, -50%) translate(0%, 0%) scale(1);
          }
          25% {
            transform: translate(-50%, -50%) translate(${xRange}%, ${-yRange}%) scale(1.05);
          }
          50% {
            transform: translate(-50%, -50%) translate(${-xRange * 0.5}%, ${yRange}%) scale(0.95);
          }
          75% {
            transform: translate(-50%, -50%) translate(${-xRange}%, ${-yRange * 0.5}%) scale(1.02);
          }
        }
      `
    }).join("\n")

    styleSheet.textContent = keyframes
    document.head.appendChild(styleSheet)

    return () => {
      const el = document.getElementById("flowing-gradient-animations")
      if (el) el.remove()
    }
  }, [reducedMotion, blobs])

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      {/* Base gradient layer */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 70% 50%, rgba(20, 184, 166, 0.15) 0%, transparent 60%)",
        }}
      />

      {/* Animated blobs */}
      {blobs.map((blob, index) => (
        <GradientBlob
          key={index}
          color={blob.color}
          size={blob.size}
          initialX={blob.x}
          initialY={blob.y}
          duration={blob.duration}
          delay={blob.delay}
          opacity={blob.opacity}
          blur={blob.blur}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)",
        }}
      />
    </div>
  )
}
