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
import type { Client } from "@/lib/mock/types"
import type { CreateClientInput } from "@/lib/hooks/crud/use-clients"

interface ClientFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<Client>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateClientInput) => void
}

export function ClientFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: ClientFormDialogProps) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [type, setType] = React.useState<Client["type"]>("individual")
  const [status, setStatus] = React.useState<Client["status"]>("prospect")
  const [aum, setAum] = React.useState("0")

  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "")
      setEmail(initialData?.email ?? "")
      setPhone(initialData?.phone ?? "")
      setType(initialData?.type ?? "individual")
      setStatus(initialData?.status ?? "prospect")
      setAum(initialData?.aum?.toString() ?? "0")
    }
  }, [open, initialData])

  function handleSubmit() {
    if (!name.trim() || !email.trim()) return
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      type,
      status,
      aum: parseFloat(aum) || 0,
      joinedDate: initialData?.joinedDate ?? new Date().toISOString().split("T")[0],
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Client" : "Edit Client"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new client to your portfolio." : "Update client information."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              placeholder="e.g., John Thompson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Client["type"])}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="institution">Institution</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="fund">Fund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Client["status"])}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assets Under Management ($)</Label>
            <Input
              type="number"
              placeholder="0"
              value={aum}
              onChange={(e) => setAum(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Add Client" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
