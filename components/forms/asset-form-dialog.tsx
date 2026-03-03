"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CreateAssetInput } from "@/lib/validations/asset.schema"

interface AssetFormDialogProps {
  mode: "create" | "edit"
  initialData?: {
    id?: string
    name?: string
    assetClass?: string
    status?: string
    entityId?: string
    description?: string | null
    acquisitionDate?: string | null
    acquisitionCost?: number | null
    currency?: string
    currentValue?: number | null
    externalId?: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateAssetInput) => void
  isPending?: boolean
  entities?: Array<{ id: string; name: string }>
}

export function AssetFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  entities = [],
}: AssetFormDialogProps) {
  const [name, setName] = React.useState("")
  const [assetClass, setAssetClass] = React.useState("real_estate")
  const [status, setStatus] = React.useState("active")
  const [entityId, setEntityId] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [acquisitionDate, setAcquisitionDate] = React.useState("")
  const [acquisitionCost, setAcquisitionCost] = React.useState("")
  const [currentValue, setCurrentValue] = React.useState("")
  const [currency, setCurrency] = React.useState("USD")
  const [externalId, setExternalId] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "")
      setAssetClass(initialData?.assetClass ?? "real_estate")
      setStatus(initialData?.status ?? "active")
      setEntityId(initialData?.entityId ?? (entities[0]?.id ?? ""))
      setDescription(initialData?.description ?? "")
      setAcquisitionDate(initialData?.acquisitionDate?.split("T")[0] ?? "")
      setAcquisitionCost(initialData?.acquisitionCost?.toString() ?? "")
      setCurrentValue(initialData?.currentValue?.toString() ?? "")
      setCurrency(initialData?.currency ?? "USD")
      setExternalId(initialData?.externalId ?? "")
    }
  }, [open, initialData, entities])

  function handleSubmit() {
    if (!name.trim()) return
    if (!entityId && mode === "create") return

    onSubmit({
      name: name.trim(),
      assetClass: assetClass as CreateAssetInput["assetClass"],
      status: status as CreateAssetInput["status"],
      entityId,
      description: description.trim() || null,
      acquisitionDate: acquisitionDate || null,
      acquisitionCost: acquisitionCost ? parseFloat(acquisitionCost) : null,
      currentValue: currentValue ? parseFloat(currentValue) : null,
      currency: currency || "USD",
      externalId: externalId.trim() || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Asset" : "Edit Asset"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new asset to your portfolio." : "Update asset details."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="asset-name">Asset Name</Label>
            <Input
              id="asset-name"
              placeholder="e.g., Manhattan Office Tower"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Class</Label>
              <Select value={assetClass} onValueChange={setAssetClass}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="equities">Equities</SelectItem>
                  <SelectItem value="private_equity">Private Equity</SelectItem>
                  <SelectItem value="fixed_income">Fixed Income</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="intellectual_property">IP</SelectItem>
                  <SelectItem value="venture_capital">Venture Capital</SelectItem>
                  <SelectItem value="hedge_funds">Hedge Funds</SelectItem>
                  <SelectItem value="commodities">Commodities</SelectItem>
                  <SelectItem value="collectibles">Collectibles</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {mode === "create" && (
            <div className="space-y-2">
              <Label>Entity</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Value ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Acquisition Cost ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Acquisition Date</Label>
              <Input
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                placeholder="USD"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Brief description of the asset"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>External ID</Label>
            <Input
              placeholder="Optional external reference"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Add Asset" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
