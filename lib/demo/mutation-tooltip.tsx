"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Wraps any mutation button in demo mode with a tooltip
 * that says "Sign up to use this."
 *
 * Prevents the child onClick from firing.
 */
export function DemoMutationTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          onClick={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          className="cursor-not-allowed"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Sign up to use this.</p>
      </TooltipContent>
    </Tooltip>
  )
}
