"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import type { KPIData } from "@/lib/mock/types"

interface KPICardProps {
  data: KPIData
  index?: number
}

export function KPICard({ data, index = 0 }: KPICardProps) {
  const reducedMotion = useReducedMotion()

  const change =
    data.format === "currency"
      ? ((data.value - data.previousValue) / data.previousValue) * 100
      : data.value - data.previousValue

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    delay: reducedMotion ? 0 : index * 100,
    immediate: reducedMotion,
  })

  const valueSpring = useSpring({
    from: { value: 0 },
    to: { value: data.value },
    config: { duration: reducedMotion ? 0 : 1000 },
    immediate: reducedMotion,
  })

  const formatValue = (value: number) => {
    switch (data.format) {
      case "currency":
        return formatCurrency(value)
      case "percentage":
        return `${value.toFixed(1)}%`
      case "score":
        return value.toFixed(0)
      default:
        return value.toLocaleString()
    }
  }

  const TrendIcon =
    data.trend === "up"
      ? TrendingUp
      : data.trend === "down"
      ? TrendingDown
      : Minus

  const isPositive =
    data.trend === "up" ||
    (data.trend === "neutral" && change >= 0) ||
    (data.label === "Portfolio Risk Score" && change < 0)

  return (
    <animated.div style={spring}>
      <Card className="hover:border-zinc-700 transition-colors">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-zinc-400">{data.label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <animated.span className="text-3xl font-bold text-zinc-100">
              {valueSpring.value.to((v) => formatValue(v))}
            </animated.span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <TrendIcon
              className={cn(
                "h-4 w-4",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {change >= 0 ? "+" : ""}
              {data.format === "percentage" || data.format === "score"
                ? change.toFixed(1)
                : formatPercentage(change)}
            </span>
            <span className="text-sm text-zinc-500">vs last period</span>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
