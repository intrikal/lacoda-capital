import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-800 text-zinc-300 ring-zinc-700",
        primary:
          "bg-teal-400/10 text-teal-400 ring-teal-400/20",
        secondary:
          "bg-cyan-400/10 text-cyan-400 ring-cyan-400/20",
        success:
          "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20",
        warning:
          "bg-amber-400/10 text-amber-400 ring-amber-400/20",
        destructive:
          "bg-red-400/10 text-red-400 ring-red-400/20",
        info:
          "bg-blue-400/10 text-blue-400 ring-blue-400/20",
        outline:
          "bg-transparent text-zinc-300 ring-zinc-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
