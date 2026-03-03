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
import type { CreateEntityInput } from "@/lib/validations/entity.schema"

interface EntityFormDialogProps {
  mode: "create" | "edit"
  initialData?: {
    id?: string
    name?: string
    entityType?: string
    clientId?: string
    jurisdiction?: string | null
    taxId?: string | null
    formationDate?: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateEntityInput) => void
  isPending?: boolean
  clients?: Array<{ id: string; displayName: string }>
}

export function EntityFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  clients = [],
}: EntityFormDialogProps) {
  const [name, setName] = React.useState("")
  const [entityType, setEntityType] = React.useState("llc")
  const [clientId, setClientId] = React.useState("")
  const [jurisdiction, setJurisdiction] = React.useState("")
  const [taxId, setTaxId] = React.useState("")
  const [formationDate, setFormationDate] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "")
      setEntityType(initialData?.entityType ?? "llc")
      setClientId(initialData?.clientId ?? (clients[0]?.id ?? ""))
      setJurisdiction(initialData?.jurisdiction ?? "")
      setTaxId(initialData?.taxId ?? "")
      setFormationDate(initialData?.formationDate?.split("T")[0] ?? "")
    }
  }, [open, initialData, clients])

  function handleSubmit() {
    if (!name.trim()) return
    if (!clientId && mode === "create") return

    onSubmit({
      name: name.trim(),
      entityType: entityType as CreateEntityInput["entityType"],
      clientId,
      jurisdiction: jurisdiction.trim() || null,
      taxId: taxId.trim() || null,
      formationDate: formationDate || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Entity" : "Edit Entity"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Register a new legal entity to your portfolio."
              : "Update entity details."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="entity-name">Entity Name</Label>
            <Input
              id="entity-name"
              placeholder="e.g., Smith Family Trust"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="foundation">Foundation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "create" && (
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jurisdiction</Label>
              <Input
                placeholder="e.g., Delaware"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Formation Date</Label>
              <Input
                type="date"
                value={formationDate}
                onChange={(e) => setFormationDate(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax ID (EIN)</Label>
            <Input
              placeholder="XX-XXXXXXX"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : mode === "create" ? "Add Entity" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
