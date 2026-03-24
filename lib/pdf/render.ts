import { renderToBuffer } from "@react-pdf/renderer"
import { PortfolioSummaryTemplate, type PortfolioSummaryData } from "./templates/portfolio-summary"
import { HoldingsDetailTemplate, type HoldingsDetailData } from "./templates/holdings-detail"

export type PDFTemplateType = "portfolio_summary" | "holdings_detail" | "asset_allocation" | "performance" | "tax_summary" | "compliance" | "client_statement" | "custom"

/**
 * renderPDF — Renders a PDF template to a Buffer.
 *
 * @param template — The report template type
 * @param data — The data to render in the template
 * @returns A PDF buffer
 */
export async function renderPDF(template: PDFTemplateType, data: unknown): Promise<Buffer> {
  try {
    switch (template) {
      case "portfolio_summary":
        return await renderToBuffer(
          <PortfolioSummaryTemplate data={data as PortfolioSummaryData} />
        )
      case "holdings_detail":
        return await renderToBuffer(
          <HoldingsDetailTemplate data={data as HoldingsDetailData} />
        )
      // Placeholder for other template types
      case "asset_allocation":
      case "performance":
      case "tax_summary":
      case "compliance":
      case "client_statement":
      case "custom":
        // For now, return portfolio summary as placeholder
        return await renderToBuffer(
          <PortfolioSummaryTemplate data={data as PortfolioSummaryData} />
        )
      default:
        throw new Error(`Unknown template type: ${template}`)
    }
  } catch (error) {
    throw new Error(`Failed to render PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
}
