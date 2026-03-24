"use client"

import { Briefcase } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { demoAssets } from "@/lib/demo/data"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value)
}

const classColors: Record<string, string> = {
  real_estate: "bg-tiffany-500/10 text-tiffany-500",
  equities: "bg-blue-500/10 text-blue-400",
  private_equity: "bg-violet-500/10 text-violet-400",
  fixed_income: "bg-amber-500/10 text-amber-400",
  venture_capital: "bg-pink-500/10 text-pink-400",
}

export default function DemoAssetsPage() {
  const totalValue = demoAssets.reduce((sum, a) => sum + a.currentValue, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Assets</h1>
          <p className="text-zinc-400 mt-1">
            {demoAssets.length} assets · {formatCurrency(totalValue)} total value
          </p>
        </div>
        <DemoMutationTooltip>
          <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium opacity-75">
            + Create Asset
          </button>
        </DemoMutationTooltip>
      </div>

      <div className="grid gap-4">
        {demoAssets.map((asset) => (
          <Card key={asset.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-zinc-800">
                  <Briefcase className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{asset.name}</p>
                  <p className="text-xs text-zinc-500">{asset.entityName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge className={classColors[asset.assetClass] ?? "bg-zinc-800 text-zinc-400"}>
                  {asset.assetClass.replace("_", " ")}
                </Badge>
                <span className="text-sm font-medium text-zinc-100 w-28 text-right">
                  {formatCurrency(asset.currentValue)}
                </span>
                <Badge variant="success" className="text-xs">{asset.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
