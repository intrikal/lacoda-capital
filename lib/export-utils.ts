// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExportManifest {
  orgId: string
  exportedAt: string
  exportedBy: string
  tables: { name: string; rowCount: number }[]
  format: "json" | "csv" | "both"
}

export interface ExportTableData {
  tableName: string
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface OrgExportResult {
  manifest: ExportManifest
  tables: ExportTableData[]
}

// ─── CSV helpers ────────────────────────────────────────────────────────────

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = typeof value === "object" ? JSON.stringify(value) : String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function tableToCSV(data: ExportTableData): string {
  const header = data.columns.map(escapeCSVValue).join(",")
  const rows = data.rows.map((row) =>
    data.columns.map((col) => escapeCSVValue(row[col])).join(",")
  )
  return [header, ...rows].join("\n")
}
