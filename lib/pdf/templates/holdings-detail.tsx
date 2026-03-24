import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

export interface HoldingsDetailData {
  orgName: string
  generatedAt: Date
  totalAUM: number
  assets: Array<{
    id: string
    name: string
    description: string | null
    assetClass: string
    currentValue: number
    acquisitionDate: string | null
    notes: string | null
  }>
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
    marginVertical: 20,
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
  assetCard: {
    marginVertical: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#14b8a6",
    backgroundColor: "#f9fafb",
    pageBreakInside: "avoid",
  },
  assetName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  assetMeta: {
    display: "flex",
    flexDirection: "row",
    marginVertical: 6,
    gap: 16,
  },
  assetMetaItem: {
    flex: 1,
  },
  assetMetaLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
  },
  assetMetaValue: {
    fontSize: 10,
    color: "#1f2937",
    fontWeight: "500",
  },
  assetDescription: {
    fontSize: 9,
    color: "#4b5563",
    marginVertical: 6,
    lineHeight: 1.4,
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

export function HoldingsDetailTemplate({ data }: { data: HoldingsDetailData }) {
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
          <Text style={styles.title}>Holdings Detail Report</Text>
          <Text style={styles.subtitle}>{data.orgName}</Text>
        </View>

        {/* Total AUM */}
        <View style={styles.kpiRow}>
          <Text style={styles.kpiLabel}>Total Assets Under Management</Text>
          <Text style={styles.kpiValue}>${(data.totalAUM / 1000000).toFixed(1)}M</Text>
        </View>

        {/* Asset Details */}
        {data.assets.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Asset Holdings ({data.assets.length})</Text>
            {data.assets.map((asset) => (
              <View key={asset.id} style={styles.assetCard}>
                <Text style={styles.assetName}>{asset.name}</Text>

                <View style={styles.assetMeta}>
                  <View style={styles.assetMetaItem}>
                    <Text style={styles.assetMetaLabel}>Asset Class</Text>
                    <Text style={styles.assetMetaValue}>{asset.assetClass}</Text>
                  </View>
                  <View style={styles.assetMetaItem}>
                    <Text style={styles.assetMetaLabel}>Current Value</Text>
                    <Text style={styles.assetMetaValue}>${(asset.currentValue / 1000000).toFixed(2)}M</Text>
                  </View>
                  {asset.acquisitionDate && (
                    <View style={styles.assetMetaItem}>
                      <Text style={styles.assetMetaLabel}>Acquisition Date</Text>
                      <Text style={styles.assetMetaValue}>
                        {new Date(asset.acquisitionDate).toLocaleDateString("en-US")}
                      </Text>
                    </View>
                  )}
                </View>

                {asset.description && (
                  <Text style={styles.assetDescription}>{asset.description}</Text>
                )}

                {asset.notes && (
                  <>
                    <Text style={{ ...styles.assetMetaLabel, marginTop: 6 }}>Notes</Text>
                    <Text style={styles.assetDescription}>{asset.notes}</Text>
                  </>
                )}
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
