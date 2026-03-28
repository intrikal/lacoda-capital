import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { formatCurrency } from "@/lib/utils"

export interface PortfolioSummaryData {
  orgName: string
  generatedAt: Date
  totalAUM: number
  assetCount: number
  assets: Array<{
    id: string
    name: string
    assetClass: string
    currentValue: number
  }>
  /** Org branding — logo URL and primary color for white-label reports */
  branding?: {
    logoUrl?: string
    primaryColor?: string
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  kpiRow: {
    display: "flex",
    flexDirection: "row",
    marginVertical: 20,
    gap: 20,
  },
  kpiBox: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginVertical: 16,
    marginTop: 24,
  },
  tableHeader: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    paddingHorizontal: 4,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: "#374151",
    paddingHorizontal: 4,
  },
  footer: {
    marginTop: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 9,
    color: "#9ca3af",
  },
})

export function PortfolioSummaryTemplate({ data }: { data: PortfolioSummaryData }) {
  const generatedAtStr = data.generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio Summary</Text>
          <Text style={styles.subtitle}>{data.orgName}</Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Assets Under Management</Text>
            <Text style={styles.kpiValue}>${(data.totalAUM / 1000000).toFixed(1)}M</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Assets</Text>
            <Text style={styles.kpiValue}>{data.assetCount}</Text>
          </View>
        </View>

        {/* Asset Listing */}
        {data.assets.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Holdings</Text>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>Asset Name</Text>
              <Text style={styles.tableHeaderCell}>Asset Class</Text>
              <Text style={styles.tableHeaderCell}>Current Value</Text>
            </View>

            {/* Table Rows */}
            {data.assets.map((asset) => (
              <View key={asset.id} style={styles.tableRow}>
                <Text style={{ ...styles.tableCell, flex: 2 }}>{asset.name}</Text>
                <Text style={styles.tableCell}>{asset.assetClass}</Text>
                <Text style={styles.tableCell}>${(asset.currentValue / 1000000).toFixed(2)}M</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={{ ...styles.sectionTitle, color: "#6b7280" }}>No assets in portfolio</Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated on {generatedAtStr} · Lacoda Capital</Text>
        </View>
      </Page>
    </Document>
  )
}
