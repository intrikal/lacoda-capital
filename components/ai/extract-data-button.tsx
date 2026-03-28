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
import { extractDocumentData, confirmExtractedData } from "@/lib/actions/ai-extraction.actions"
import type { ExtractionOutput } from "@/lib/agents/extraction"

// ============================================================================
// Extract Data Button + Confirmation Dialog
// ============================================================================
//
// "Extract Data" button on vault documents. Sends document to AI, shows
// pre-filled form with yellow highlights on low-confidence fields.
// User reviews, edits, and confirms to create asset + valuation.
// ============================================================================

interface ExtractDataButtonProps {
  documentId: string
  documentName: string
  onAssetCreated?: (assetId: string) => void
}

const FIELD_LABELS: Record<string, string> = {
  property_address: "Property Address",
  valuation_amount: "Valuation Amount",
  valuation_date: "Valuation Date",
  appraiser_name: "Appraiser Name",
  document_type: "Document Type",
  asset_name: "Asset Name",
  asset_class: "Asset Class",
}

export function ExtractDataButton({ documentId, documentName, onAssetCreated }: ExtractDataButtonProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractionOutput | null>(null)
  const [flaggedFields, setFlaggedFields] = useState<string[]>([])
  const [editedData, setEditedData] = useState<Partial<ExtractionOutput>>({})
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExtract = useCallback(async () => {
    setIsExtracting(true)
    setError(null)

    try {
      const result = await extractDocumentData(documentId)

      if (!result.success) {
        setError(result.error)
        return
      }

      setExtractedData(result.data)
      setFlaggedFields(result.flaggedFields ?? [])
      setEditedData({})
      setShowDialog(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed")
    } finally {
      setIsExtracting(false)
    }
  }, [documentId])

  const handleConfirm = useCallback(async () => {
    if (!extractedData) return

    setIsConfirming(true)
    setError(null)

    try {
      const result = await confirmExtractedData({
        documentId,
        extractedData,
        overrides: editedData,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setShowDialog(false)
      onAssetCreated?.(result.assetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed")
    } finally {
      setIsConfirming(false)
    }
  }, [documentId, extractedData, editedData, onAssetCreated])

  const getFieldValue = (field: keyof ExtractionOutput) => {
    if (field === "confidence") return undefined
    const edited = editedData[field]
    if (edited !== undefined) return edited
    return extractedData?.[field]
  }

  const updateField = (field: string, value: string | number | null) => {
    setEditedData((prev) => ({ ...prev, [field]: value }))
  }

  const isFieldFlagged = (field: string) => flaggedFields.includes(field)

  return (
    <>
      <Button
        onClick={handleExtract}
        disabled={isExtracting}
        variant="outline"
        size="sm"
      >
        {isExtracting ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Extracting...
          </>
        ) : (
          "Extract Data"
        )}
      </Button>

      {error && !showDialog && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Extracted Data</DialogTitle>
            <DialogDescription>
              AI extracted the following from &quot;{documentName}&quot;. Fields highlighted in yellow have low confidence — please verify.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {Object.entries(FIELD_LABELS).map(([field, label]) => {
              const value = getFieldValue(field as keyof ExtractionOutput)
              const confidence = extractedData?.confidence?.[field] ?? 0
              const isFlagged = isFieldFlagged(field)

              return (
                <div key={field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field}>{label}</Label>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        confidence >= 0.8
                          ? "bg-emerald-900/50 text-emerald-400"
                          : confidence >= 0.5
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {(confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <Input
                    id={field}
                    value={value != null ? String(value) : ""}
                    onChange={(e) => {
                      const newValue = field === "valuation_amount"
                        ? e.target.value ? Number(e.target.value) : null
                        : e.target.value || null
                      updateField(field, newValue)
                    }}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className={isFlagged ? "border-yellow-500 bg-yellow-950/20" : ""}
                    type={field === "valuation_amount" ? "number" : "text"}
                  />
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating Asset...
                </>
              ) : (
                "Confirm & Create Asset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
