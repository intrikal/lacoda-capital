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
import type { Asset, AssetClass, AssetStatus } from "@/lib/mock/types"
import type { CreateAssetInput } from "@/lib/hooks/crud/use-assets"

interface AssetFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<Asset>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateAssetInput) => void
}

export function AssetFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: AssetFormDialogProps) {
  const [name, setName] = React.useState("")
  const [assetClass, setAssetClass] = React.useState<AssetClass>("real_estate")
  const [status, setStatus] = React.useState<AssetStatus>("active")
  const [value, setValue] = React.useState("0")
  const [location, setLocation] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [riskScore, setRiskScore] = React.useState("50")

  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "")
      setAssetClass(initialData?.class ?? "real_estate")
      setStatus(initialData?.status ?? "active")
      setValue(initialData?.value?.toString() ?? "0")
      setLocation(initialData?.location ?? "")
      setDescription(initialData?.description ?? "")
      setNotes(initialData?.notes ?? "")
      setRiskScore(initialData?.riskScore?.toString() ?? "50")
    }
  }, [open, initialData])

  function handleSubmit() {
    if (!name.trim()) return
    const val = parseFloat(value) || 0
    onSubmit({
      name: name.trim(),
      class: assetClass,
      status,
      value: val,
      previousValue: initialData?.previousValue ?? val,
      acquisitionDate: initialData?.acquisitionDate ?? new Date().toISOString().split("T")[0],
      lastValuationDate: new Date().toISOString().split("T")[0],
      location: location.trim() || undefined,
      description: description.trim(),
      documents: initialData?.documents ?? [],
      notes: notes.trim(),
      assignedTo: initialData?.assignedTo,
      riskScore: parseInt(riskScore) || 50,
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
            <Label>Asset Name</Label>
            <Input
              placeholder="e.g., Manhattan Office Tower"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Class</Label>
              <Select value={assetClass} onValueChange={(v) => setAssetClass(v as AssetClass)}>
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
                  <SelectItem value="alternatives">Alternatives</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AssetStatus)}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Value ($)</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Score (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riskScore}
                onChange={(e) => setRiskScore(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="e.g., New York, NY"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
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
            <Label>Notes</Label>
            <Input
              placeholder="Additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Add Asset" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
