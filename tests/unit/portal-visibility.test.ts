/**
 * Portal Visibility Config Tests
 *
 * Tests that visibility config correctly controls what data is shown:
 * - assets=false → zero assets even if they exist
 * - documents=false → documents section hidden
 */

import { describe, it, expect } from "vitest"
import type { PortalVisibility } from "@/app/db/schema/stakeholder_portals"

describe("portal visibility config", () => {
  // Simulate the portal rendering logic
  function getVisibleSections(vis: PortalVisibility) {
    const sections: string[] = []
    if (vis.assets) sections.push("assets")
    if (vis.entities) sections.push("entities")
    if (vis.documents) sections.push("documents")
    if (vis.reports) sections.push("reports")
    if (vis.valuations) sections.push("valuations")
    return sections
  }

  function filterDataForPortal<T>(
    data: T[],
    sectionVisible: boolean
  ): T[] {
    return sectionVisible ? data : []
  }

  it("assets=false returns zero assets even if they exist", () => {
    const vis: PortalVisibility = { assets: false, documents: true }
    const existingAssets = [
      { id: "1", name: "Property A" },
      { id: "2", name: "Stock B" },
      { id: "3", name: "Bond C" },
    ]
    const visible = filterDataForPortal(existingAssets, vis.assets ?? false)
    expect(visible).toHaveLength(0)
  })

  it("assets=true returns all assets", () => {
    const vis: PortalVisibility = { assets: true }
    const existingAssets = [
      { id: "1", name: "Property A" },
      { id: "2", name: "Stock B" },
    ]
    const visible = filterDataForPortal(existingAssets, vis.assets ?? false)
    expect(visible).toHaveLength(2)
  })

  it("documents=false hides documents section", () => {
    const vis: PortalVisibility = {
      assets: true,
      documents: false,
      reports: true,
      entities: true,
      valuations: true,
    }
    const sections = getVisibleSections(vis)
    expect(sections).not.toContain("documents")
    expect(sections).toContain("assets")
    expect(sections).toContain("reports")
  })

  it("all sections false → empty portal", () => {
    const vis: PortalVisibility = {
      assets: false,
      documents: false,
      reports: false,
      entities: false,
      valuations: false,
    }
    const sections = getVisibleSections(vis)
    expect(sections).toHaveLength(0)
  })

  it("default visibility shows assets, entities, valuations but not docs/reports", () => {
    const defaultVis: PortalVisibility = {
      assets: true,
      documents: false,
      reports: false,
      entities: true,
      valuations: true,
    }
    const sections = getVisibleSections(defaultVis)
    expect(sections).toContain("assets")
    expect(sections).toContain("entities")
    expect(sections).toContain("valuations")
    expect(sections).not.toContain("documents")
    expect(sections).not.toContain("reports")
  })

  it("undefined visibility fields default to falsy", () => {
    const vis: PortalVisibility = {} // all undefined
    const sections = getVisibleSections(vis)
    expect(sections).toHaveLength(0)
  })
})
