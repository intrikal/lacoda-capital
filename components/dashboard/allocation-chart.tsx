"use client"

import * as React from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { mockAllocationData } from "@/lib/mock/data"

export function AllocationChart() {
  const total = mockAllocationData.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-lg">
          <p className="font-medium text-zinc-100">{data.name}</p>
          <p className="text-teal-400">{formatCurrency(data.value)}</p>
          <p className="text-sm text-zinc-500">
            {((data.value / total) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-zinc-400 truncate">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Portfolio Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={mockAllocationData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {mockAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-sm text-zinc-500">Total AUM</p>
          <p className="text-2xl font-bold text-zinc-100">
            {formatCurrency(total)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
