"use client"

import { Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { demoClients } from "@/lib/demo/data"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value)
}

export default function DemoClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Clients</h1>
          <p className="text-zinc-400 mt-1">{demoClients.length} active clients</p>
        </div>
        <DemoMutationTooltip>
          <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium opacity-75">
            + Add Client
          </button>
        </DemoMutationTooltip>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-800">
            {demoClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                    {client.displayName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{client.displayName}</p>
                    <p className="text-xs text-zinc-500">
                      {client.entityCount} entities · {client.assetCount} assets
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-zinc-100">{formatCurrency(client.totalAUM)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{client.clientType}</Badge>
                  <Badge variant="success" className="text-xs">{client.clientStatus}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
