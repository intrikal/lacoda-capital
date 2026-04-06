"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Columns,
  Eye,
  Rocket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ASSET_IMPORT_FIELDS,
  validateCSVImport,
  executeCSVImport,
  type CSVRow,
  type ColumnMapping,
  type ImportPreview,
  type ImportResult,
} from "@/lib/actions/import.actions"

// ─── Steps ──────────────────────────────────────────────────────────────────

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete"

// ─── Page component ─────────────────────────────────────────────────────────

export default function CSVImportPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<ImportStep>("upload")
  const [file, setFile] = React.useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([])
  const [csvRows, setCsvRows] = React.useState<CSVRow[]>([])
  const [mapping, setMapping] = React.useState<ColumnMapping>({})
  const [preview, setPreview] = React.useState<ImportPreview | null>(null)
  const [result, setResult] = React.useState<ImportResult | null>(null)
  const [isValidating, setIsValidating] = React.useState(false)
  const [, setIsImporting] = React.useState(false)
  const [importProgress, setImportProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ── File handling ──────────────────────────────────────────────────────

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      parseFile(droppedFile)
    } else {
      setError("Please upload a CSV file")
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      parseFile(selectedFile)
    }
  }

  function parseFile(f: File) {
    setFile(f)
    setError(null)

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      // Handle UTF-8 BOM
      transformHeader: (header: string) => header.replace(/^\uFEFF/, "").trim(),
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError("Failed to parse CSV file. Please check the format.")
          return
        }

        const data = results.data as CSVRow[]

        if (data.length === 0) {
          setError("CSV file is empty (headers only, no data rows)")
          return
        }

        const headers = results.meta.fields ?? []
        setCsvHeaders(headers)
        setCsvRows(data)

        // Auto-map columns by fuzzy matching header names
        const autoMapping: ColumnMapping = {}
        for (const header of headers) {
          const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "")
          for (const field of ASSET_IMPORT_FIELDS) {
            const fieldNorm = field.key.toLowerCase()
            const labelNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, "")
            if (normalized === fieldNorm || normalized === labelNorm || normalized.includes(fieldNorm)) {
              autoMapping[header] = field.key
              break
            }
          }
        }
        setMapping(autoMapping)
        setStep("mapping")
      },
      error: () => {
        setError("Failed to parse CSV file")
      },
    })
  }

  // ── Mapping ────────────────────────────────────────────────────────────

  function updateMapping(csvHeader: string, fieldKey: string | null) {
    setMapping((prev) => ({ ...prev, [csvHeader]: fieldKey }))
  }

  const hasNameMapped = Object.values(mapping).includes("name")

  // ── Validation ─────────────────────────────────────────────────────────

  async function handleValidate() {
    setIsValidating(true)
    try {
      const result = await validateCSVImport(csvRows, mapping)
      setPreview(result)
      setStep("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed")
    } finally {
      setIsValidating(false)
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!preview) return
    setStep("importing")
    setIsImporting(true)

    // Simulate progress for large imports
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 5, 90))
    }, 200)

    try {
      const result = await executeCSVImport(preview.validRows)
      clearInterval(progressInterval)
      setImportProgress(100)
      setResult(result)
      setStep("complete")
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : "Import failed")
      setStep("preview")
    } finally {
      setIsImporting(false)
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────

  function handleReset() {
    setStep("upload")
    setFile(null)
    setCsvHeaders([])
    setCsvRows([])
    setMapping({})
    setPreview(null)
    setResult(null)
    setError(null)
    setImportProgress(0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/app/assets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Import Assets from CSV</h1>
          <p className="text-zinc-400 mt-1">Upload a CSV file, map columns, preview, and import</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {(["upload", "mapping", "preview", "complete"] as const).map((s, i) => {
          const labels = ["Upload", "Map Columns", "Preview", "Done"]
          const icons = [Upload, Columns, Eye, Rocket]
          const Icon = icons[i]
          const isActive = step === s || (step === "importing" && s === "preview")
          const isDone =
            (s === "upload" && step !== "upload") ||
            (s === "mapping" && !["upload", "mapping"].includes(step)) ||
            (s === "preview" && step === "complete")

          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isDone
                      ? "bg-teal-500/20 text-teal-400"
                      : isActive
                        ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
                        : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn("text-sm", isActive ? "text-zinc-200" : "text-zinc-500")}>
                  {labels[i]}
                </span>
              </div>
              {i < 3 && <div className="h-px flex-1 bg-zinc-800" />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="p-8">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/20 px-8 py-16 text-center transition-colors hover:border-zinc-600 hover:bg-zinc-800/40"
            >
              <FileSpreadsheet className="h-12 w-12 text-zinc-500 mb-4" />
              <h3 className="text-lg font-medium text-zinc-200 mb-2">
                Drop your CSV file here
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                or click to browse. Supports .csv files up to 50,000 rows.
              </p>
              <Button variant="outline" className="pointer-events-none">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <p className="mt-4 text-xs text-zinc-600 text-center">
              CSV should have a header row. Supported fields: Asset Name, Asset Class, Entity Name,
              Current Value, Currency, Description, Address.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Map CSV Columns
                {file && (
                  <span className="ml-2 text-xs text-zinc-500 font-normal">
                    ({csvRows.length} rows from {file.name})
                  </span>
                )}
              </CardTitle>
              <Badge variant={hasNameMapped ? "default" : "destructive"}>
                {hasNameMapped ? "Ready" : "Map 'Name' column"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Column</TableHead>
                  <TableHead>Sample Value</TableHead>
                  <TableHead>Map to Field</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvHeaders.map((header) => (
                  <TableRow key={header}>
                    <TableCell className="font-mono text-sm text-zinc-300">{header}</TableCell>
                    <TableCell className="text-sm text-zinc-500 max-w-[200px] truncate">
                      {csvRows[0]?.[header] ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping[header] ?? "_skip"}
                        onValueChange={(v) => updateMapping(header, v === "_skip" ? null : v)}
                      >
                        <SelectTrigger className="h-9 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_skip">
                            <span className="text-zinc-500">Skip this column</span>
                          </SelectItem>
                          {ASSET_IMPORT_FIELDS.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                              {field.required && <span className="text-red-400 ml-1">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" onClick={handleReset}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Start over
              </Button>
              <Button onClick={handleValidate} disabled={!hasNameMapped || isValidating}>
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Preview import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">{preview.totalRows}</p>
                <p className="text-xs text-zinc-500">Total Rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-teal-400">{preview.validRows.length}</p>
                <p className="text-xs text-zinc-500">Valid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{preview.invalidRows.length}</p>
                <p className="text-xs text-zinc-500">Invalid</p>
              </CardContent>
            </Card>
          </div>

          {/* Invalid rows (if any) */}
          {preview.invalidRows.length > 0 && (
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="text-base text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Invalid Rows ({preview.invalidRows.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.invalidRows.slice(0, 20).map((row) => (
                      <TableRow key={row.rowIndex} className="bg-red-500/5">
                        <TableCell className="text-zinc-400">{row.rowIndex}</TableCell>
                        <TableCell className="text-zinc-300">{row.data.name ?? "—"}</TableCell>
                        <TableCell>
                          {row.errors.map((err, i) => (
                            <span key={i} className="text-sm text-red-400 block">
                              {err}
                            </span>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Valid rows preview */}
          <Card className="border-teal-500/20">
            <CardHeader>
              <CardTitle className="text-base text-teal-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Valid Rows ({preview.validRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.validRows.slice(0, 20).map((row) => (
                    <TableRow key={row.rowIndex} className="bg-teal-500/5">
                      <TableCell className="text-zinc-400">{row.rowIndex}</TableCell>
                      <TableCell className="text-zinc-200 font-medium">{row.data.name}</TableCell>
                      <TableCell className="text-zinc-400">
                        {row.data.assetClass?.replace(/_/g, " ") ?? "—"}
                      </TableCell>
                      <TableCell className="text-zinc-400">{row.data.entityName ?? "—"}</TableCell>
                      <TableCell className="text-zinc-400">
                        {row.data.value ? `$${row.data.value.toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {preview.validRows.length > 20 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-zinc-500 text-sm">
                        ... and {preview.validRows.length - 20} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("mapping")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to mapping
            </Button>
            <Button
              onClick={handleImport}
              disabled={preview.validRows.length === 0}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Import {preview.validRows.length} assets
            </Button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin mb-4" />
            <h3 className="text-lg font-medium text-zinc-100 mb-2">Importing assets...</h3>
            <p className="text-sm text-zinc-500 mb-6">
              Processing rows in batches of 100. This may take a moment.
            </p>
            <div className="w-full max-w-xs">
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-zinc-600 mt-2">{importProgress}% complete</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {step === "complete" && result && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-full bg-teal-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">Import Complete</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Successfully created <strong className="text-teal-400">{result.created}</strong> assets
              {result.failed > 0 && (
                <>, <strong className="text-red-400">{result.failed}</strong> failed</>
              )}
            </p>

            {result.errors.length > 0 && (
              <div className="w-full max-w-md mb-6 text-left rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm font-medium text-red-400 mb-2">Errors:</p>
                {result.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-red-300">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                Import more
              </Button>
              <Button onClick={() => router.push("/app/assets")}>
                View Assets
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
