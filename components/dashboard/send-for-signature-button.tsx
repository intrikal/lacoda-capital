"use client"

import * as React from "react"
import { PenLine, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { sendForSignature } from "@/lib/actions/docusign.actions"

interface SendForSignatureButtonProps {
  documentRequestId: string
  documentName: string
  /** Pre-fill signer info if known */
  defaultSignerEmail?: string
  defaultSignerName?: string
  /** Callback after envelope is created */
  onSent?: (envelopeId: string, signingUrl: string | null) => void
  disabled?: boolean
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "ghost"
  className?: string
}

export function SendForSignatureButton({
  documentRequestId,
  documentName,
  defaultSignerEmail = "",
  defaultSignerName = "",
  onSent,
  disabled,
  size = "sm",
  variant = "outline",
  className,
}: SendForSignatureButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [signerEmail, setSignerEmail] = React.useState(defaultSignerEmail)
  const [signerName, setSignerName] = React.useState(defaultSignerName)
  const [error, setError] = React.useState<string | null>(null)

  const handleSend = async () => {
    if (!signerEmail || !signerName) {
      setError("Signer email and name are required")
      return
    }

    setSending(true)
    setError(null)

    try {
      const result = await sendForSignature({
        documentRequestId,
        signerEmail,
        signerName,
        documentName,
        returnUrl: `${window.location.origin}/app/vault?signed=true`,
      })

      setOpen(false)
      onSent?.(result.envelopeId, result.signingUrl)

      // If we got a signing URL, open it for embedded signing
      if (result.signingUrl) {
        window.open(result.signingUrl, "_blank")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send for signature")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <PenLine className="h-4 w-4 mr-1" />
        Send for Signature
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-tiffany-500" />
              Send for Signature
            </DialogTitle>
            <DialogDescription>
              Send &ldquo;{documentName}&rdquo; to a recipient for electronic signature via DocuSign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="signer-name" className="text-sm font-medium text-zinc-100 block mb-1.5">
                Signer Name
              </label>
              <input
                id="signer-name"
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-tiffany-500/50"
              />
            </div>

            <div>
              <label htmlFor="signer-email" className="text-sm font-medium text-zinc-100 block mb-1.5">
                Signer Email
              </label>
              <input
                id="signer-email"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-tiffany-500/50"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !signerEmail || !signerName}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
