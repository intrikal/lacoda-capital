/**
 * transfer-form-dialog.tsx
 *
 * Modal dialog for submitting a new client fund transfer request.
 * Covers three transfer types:
 *   - Deposit   : bank → investment account
 *   - Withdrawal: investment account → bank
 *   - Transfer  : between investment accounts
 *
 * The available "from" / "to" accounts are dynamically filtered based on
 * the selected transfer type to prevent invalid pairings.
 *
 * Props:
 *   open         — controls dialog visibility
 *   onOpenChange — parent state setter
 *   onSubmit     — called with validated form data on confirmation
 *
 * @example
 * ```tsx
 * <TransferFormDialog
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 *   onSubmit={(data) => addTransfer(data)}
 * />
 * ```
 */

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
import type { CreateTransferInput } from "@/lib/hooks/crud/use-client-transfers"
import type { ClientTransferType } from "@/lib/mock/types"

// ─────────────────────────────────────────────────────────────────────────────
// Static account lists — replace with hook data when connected to real API
// ─────────────────────────────────────────────────────────────────────────────

/** External bank accounts the client has linked */
const BANK_ACCOUNTS = ["Chase Bank ****4532", "Bank of America ****7891"]

/** Internal investment accounts */
const INVESTMENT_ACCOUNTS = ["Brokerage Account", "Retirement IRA", "Roth IRA"]

/** Recurring frequency options */
const FREQUENCIES = ["One-time", "Weekly", "Monthly", "Quarterly"]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface TransferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTransferInput) => void
}

export function TransferFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: TransferFormDialogProps) {
  const [type, setType] = React.useState<ClientTransferType>("deposit")
  const [amount, setAmount] = React.useState("")
  const [fromAccount, setFromAccount] = React.useState("")
  const [toAccount, setToAccount] = React.useState("")
  const [frequency, setFrequency] = React.useState("One-time")

  // Reset form whenever the dialog opens
  React.useEffect(() => {
    if (open) {
      setType("deposit")
      setAmount("")
      setFromAccount("")
      setToAccount("")
      setFrequency("One-time")
    }
  }, [open])

  // ── Dynamic account options based on transfer type ───────────────────────
  // Deposit:    from bank  → to investment
  // Withdrawal: from investment → to bank
  // Transfer:   from investment → to investment

  const fromOptions =
    type === "deposit" ? BANK_ACCOUNTS : INVESTMENT_ACCOUNTS

  const toOptions =
    type === "withdrawal"
      ? BANK_ACCOUNTS
      : INVESTMENT_ACCOUNTS.filter((a) => a !== fromAccount)

  // Reset account selections when type changes
  React.useEffect(() => {
    setFromAccount("")
    setToAccount("")
  }, [type])

  function handleSubmit() {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0 || !fromAccount || !toAccount) return

    onSubmit({ type, amount: parsedAmount, fromAccount, toAccount, frequency })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>New Transfer Request</DialogTitle>
          <DialogDescription>
            Submit a fund movement request to your advisor for processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transfer type */}
          <div className="space-y-2">
            <Label>Transfer Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as ClientTransferType)}
            >
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="deposit">Deposit — Bank → Investment</SelectItem>
                <SelectItem value="withdrawal">Withdrawal — Investment → Bank</SelectItem>
                <SelectItem value="transfer">Transfer — Between Accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount ($)</Label>
            <Input
              type="number"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>

          {/* From / To accounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Account</Label>
              <Select value={fromAccount} onValueChange={setFromAccount}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {fromOptions.map((acct) => (
                    <SelectItem key={acct} value={acct}>
                      {acct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Account</Label>
              <Select value={toAccount} onValueChange={setToAccount}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {toOptions.map((acct) => (
                    <SelectItem key={acct} value={acct}>
                      {acct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
