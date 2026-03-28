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
import { generateReportNarrative, saveReportNarrative } from "@/lib/actions/ai-narrative.actions"

// ============================================================================
// Generate Summary Button + Editor Dialog
// ============================================================================
//
// "Generate Summary" in report builder. AI writes 2-3 paragraph professional
// summary. User can edit before saving. Tracks AI vs manual in report_version.
// ============================================================================

interface GenerateSummaryButtonProps {
  reportId: string
  onSaved?: (versionNumber: number) => void
}

export function GenerateSummaryButton({ reportId, onSaved }: GenerateSummaryButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [summary, setSummary] = useState("")
  const [keyHighlights, setKeyHighlights] = useState<string[]>([])
  const [isEdited, setIsEdited] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false)

  const handleGenerate = useCallback(async () => {
    // If the user has edited the text, warn before regenerating
    if (isEdited && showDialog) {
      setShowRegenerateWarning(true)
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateReportNarrative(reportId)

      if (!result.success) {
        setError(result.error)
        return
      }

      setSummary(result.data.summary)
      setKeyHighlights(result.data.key_highlights)
      setIsEdited(false)
      setShowDialog(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }, [reportId, isEdited, showDialog])

  const handleConfirmRegenerate = useCallback(async () => {
    setShowRegenerateWarning(false)
    setIsEdited(false)
    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateReportNarrative(reportId)

      if (!result.success) {
        setError(result.error)
        return
      }

      setSummary(result.data.summary)
      setKeyHighlights(result.data.key_highlights)
      setIsEdited(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }, [reportId])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    try {
      const result = await saveReportNarrative({
        reportId,
        summary,
        keyHighlights,
        isAiGenerated: !isEdited,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setShowDialog(false)
      onSaved?.(result.versionNumber)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setIsSaving(false)
    }
  }, [reportId, summary, keyHighlights, isEdited, onSaved])

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        variant="outline"
        size="sm"
      >
        {isGenerating ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Generating...
          </>
        ) : (
          "Generate Summary"
        )}
      </Button>

      {error && !showDialog && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI-Generated Summary</DialogTitle>
            <DialogDescription>
              Review and edit the narrative below. Click &quot;Save&quot; to add it to the report.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {showRegenerateWarning && (
            <div className="rounded-md bg-yellow-950/30 border border-yellow-800 p-3">
              <p className="text-sm text-yellow-400">
                Your edits will be replaced. Are you sure?
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowRegenerateWarning(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmRegenerate} disabled={isGenerating}>
                  {isGenerating ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300">Narrative</label>
              <textarea
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value)
                  setIsEdited(true)
                }}
                className="mt-1 w-full min-h-[200px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">Key Highlights</label>
              <div className="mt-1 space-y-2">
                {keyHighlights.map((highlight, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-cyan-400 text-sm">•</span>
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => {
                        const updated = [...keyHighlights]
                        updated[i] = e.target.value
                        setKeyHighlights(updated)
                        setIsEdited(true)
                      }}
                      className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            {isEdited && (
              <p className="text-xs text-yellow-400">Edited — will be saved as &quot;manual&quot; version</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Regenerating..." : "Regenerate"}
            </Button>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save to Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
