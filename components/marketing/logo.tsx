import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  showText?: boolean
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
}

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
}

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo Mark */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizeClasses[size], "w-auto")}
      >
        {/* Outer hexagon */}
        <path
          d="M20 2L36.5 11.5V29.5L20 39L3.5 29.5V11.5L20 2Z"
          stroke="url(#logo-gradient)"
          strokeWidth="2"
          fill="none"
        />
        {/* Inner connected nodes */}
        <circle cx="20" cy="12" r="3" fill="url(#logo-gradient)" />
        <circle cx="12" cy="24" r="3" fill="url(#logo-gradient)" />
        <circle cx="28" cy="24" r="3" fill="url(#logo-gradient)" />
        {/* Connecting lines */}
        <path
          d="M20 12L12 24M20 12L28 24M12 24L28 24"
          stroke="url(#logo-gradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Center point */}
        <circle cx="20" cy="20" r="2" fill="url(#logo-gradient)" />
        {/* Gradient definitions */}
        <defs>
          <linearGradient
            id="logo-gradient"
            x1="3.5"
            y1="2"
            x2="36.5"
            y2="39"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#14b8a6" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight text-zinc-100",
            textSizeClasses[size]
          )}
        >
          Lacoda Capital
        </span>
      )}
    </div>
  )
}
