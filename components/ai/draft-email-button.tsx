"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { draftDocumentRequestEmail, sendDocumentRequestEmail } from "@/lib/actions/ai-email-draft.actions"

// ============================================================================
// Draft Email Button + Editor Dialog
// ============================================================================
//
// "Draft Email" on document requests. AI generates professional email
// with context. User reviews, edits subject/body, then sends via Resend.
// ============================================================================

interface DraftEmailButtonProps {
  requestId: string
  onSent?: () => void
}

export function DraftEmailButton({ requestId, onSent }: DraftEmailButtonProps) {
  const [isDrafting, setIsDrafting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactName, setContactName] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleDraft = useCallback(async () => {
    setIsDrafting(true)
    setError(null)

    try {
      const result = await draftDocumentRequestEmail(requestId)

      if (!result.success) {
        setError(result.error)
        return
      }

      setSubject(result.data.subject)
      setBody(result.data.body)
      setContactEmail(result.contactEmail)
      setContactName(result.contactName)
      setSent(false)
      setShowDialog(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drafting failed")
    } finally {
      setIsDrafting(false)
    }
  }, [requestId])

  const handleSend = useCallback(async () => {
    setIsSending(true)
    setError(null)

    try {
      const result = await sendDocumentRequestEmail({
        requestId,
        to: contactEmail,
        subject,
        body,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setSent(true)
      onSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed")
    } finally {
      setIsSending(false)
    }
  }, [requestId, contactEmail, subject, body, onSent])

  return (
    <>
      <Button
        onClick={handleDraft}
        disabled={isDrafting}
        variant="outline"
        size="sm"
      >
        {isDrafting ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Drafting...
          </>
        ) : (
          "Draft Email"
        )}
      </Button>

      {error && !showDialog && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {sent ? "Email Sent" : "AI-Drafted Email"}
            </DialogTitle>
            <DialogDescription>
              {sent
                ? `Email sent to ${contactName} (${contactEmail})`
                : "Review and edit the email before sending."
              }
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {sent ? (
            <div className="rounded-md bg-emerald-950/30 border border-emerald-800 p-4 text-center">
              <p className="text-emerald-400">Email sent successfully!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>To</Label>
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label>Name</Label>
                  <Input
                    value={contactName}
                    readOnly
                    className="mt-1 opacity-60"
                  />
                </div>
              </div>

              <div>
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Body</Label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="mt-1 w-full min-h-[250px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-cyan-600"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {sent ? (
              <Button onClick={() => setShowDialog(false)}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={isSending || !contactEmail}>
                  {isSending ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    "Send Email"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
