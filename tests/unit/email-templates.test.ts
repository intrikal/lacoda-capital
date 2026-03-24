import { describe, it, expect } from "vitest"

/**
 * Email template unit tests.
 *
 * Tests that email template generation includes correct data.
 * We test the template-building logic directly (not the Deno Edge Function).
 */

interface ExpirationDoc {
  name: string
  assetName: string
  expiresAt: string
  daysUntilExpiry: number
}

interface ExpirationData {
  userName: string
  documents: ExpirationDoc[]
  orgName: string
}

// Simplified version of the template logic from send-email/index.ts
function buildExpirationSubject(data: ExpirationData): string {
  const count = data.documents.length
  return count === 1
    ? `Document "${data.documents[0].name}" is expiring soon`
    : `${count} documents need attention — ${data.orgName}`
}

function buildExpirationHtml(data: ExpirationData): string {
  const rows = data.documents.map((doc) => {
    const statusText =
      doc.daysUntilExpiry <= 0
        ? "EXPIRED"
        : doc.daysUntilExpiry === 1
          ? "Expires tomorrow"
          : `${doc.daysUntilExpiry} days left`
    return `<td>${doc.name}</td><td>${doc.assetName}</td><td>${statusText}</td><td>${doc.expiresAt}</td>`
  })
  return `<html>${data.userName}${data.orgName}${rows.join("")}</html>`
}

describe("expiration reminder email template", () => {
  it("includes document name, linked asset, and expiration date for 7-day reminder", () => {
    const data: ExpirationData = {
      userName: "Kevin",
      documents: [
        {
          name: "Trust Agreement v3",
          assetName: "Manhattan Office Tower",
          expiresAt: "Jan 15, 2026",
          daysUntilExpiry: 7,
        },
      ],
      orgName: "Acme Wealth",
    }

    const subject = buildExpirationSubject(data)
    const html = buildExpirationHtml(data)

    expect(subject).toContain("Trust Agreement v3")
    expect(subject).toContain("expiring soon")
    expect(html).toContain("Trust Agreement v3")
    expect(html).toContain("Manhattan Office Tower")
    expect(html).toContain("Jan 15, 2026")
    expect(html).toContain("7 days left")
    expect(html).toContain("Kevin")
  })

  it("shows 'Expires tomorrow' for 1-day reminder", () => {
    const data: ExpirationData = {
      userName: "Kevin",
      documents: [
        {
          name: "Insurance Certificate",
          assetName: "Park Avenue Condo",
          expiresAt: "Jan 10, 2026",
          daysUntilExpiry: 1,
        },
      ],
      orgName: "Acme Wealth",
    }

    const html = buildExpirationHtml(data)
    expect(html).toContain("Expires tomorrow")
  })

  it("shows 'EXPIRED' for already-expired documents", () => {
    const data: ExpirationData = {
      userName: "Kevin",
      documents: [
        {
          name: "Tax Return 2024",
          assetName: "Holdings LLC",
          expiresAt: "Dec 31, 2025",
          daysUntilExpiry: 0,
        },
      ],
      orgName: "Acme Wealth",
    }

    const html = buildExpirationHtml(data)
    expect(html).toContain("EXPIRED")
  })

  it("uses summary subject for multiple documents", () => {
    const data: ExpirationData = {
      userName: "Kevin",
      documents: [
        { name: "Doc A", assetName: "Asset A", expiresAt: "Jan 10", daysUntilExpiry: 3 },
        { name: "Doc B", assetName: "Asset B", expiresAt: "Jan 12", daysUntilExpiry: 5 },
        { name: "Doc C", assetName: "Asset C", expiresAt: "Jan 14", daysUntilExpiry: 7 },
      ],
      orgName: "Smith Advisory",
    }

    const subject = buildExpirationSubject(data)
    expect(subject).toBe("3 documents need attention — Smith Advisory")
  })
})
