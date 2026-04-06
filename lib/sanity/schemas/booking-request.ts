// Sanity Schema — Booking Request
// Add this to your Sanity Studio's schema list.
//
// When a visitor submits the "Schedule a Call" form on your site,
// it creates a document here with status "pending".
//
// Your workflow:
//   1. You see the request in Studio
//   2. Review name, company, reason
//   3. Set status → "approved" or "denied"
//   4. Sanity fires a webhook → Vercel API route:
//        approved: creates Google Calendar event + sends confirmation email
//        denied:   reopens the slot + sends a polite decline email

export const bookingRequestSchema = {
  name: "bookingRequest",
  title: "Booking Requests",
  type: "document",
  fields: [
    // ── Requester Info ──────────────────────────────────────────────────────
    {
      name: "name",
      title: "Name",
      type: "string",
      readOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "email",
      title: "Email",
      type: "string",
      readOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "company",
      title: "Company",
      type: "string",
      readOnly: true,
    },
    {
      name: "reason",
      title: "Reason for Call",
      type: "text",
      rows: 4,
      readOnly: true,
    },

    // ── Slot Reference ──────────────────────────────────────────────────────
    {
      name: "slot",
      title: "Requested Slot",
      type: "reference",
      to: [{ type: "availabilitySlot" }],
      readOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },

    // ── Approval ────────────────────────────────────────────────────────────
    {
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Pending review", value: "pending" },
          { title: "Approved — send invite", value: "approved" },
          { title: "Denied — decline email", value: "denied" },
        ],
        layout: "radio",
      },
      initialValue: "pending",
      description:
        "Change to Approved or Denied. A webhook fires automatically on save.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "internalNotes",
      title: "Internal Notes",
      type: "text",
      rows: 2,
      description: "Only visible to you — not sent in any email",
    },

    // ── Metadata ────────────────────────────────────────────────────────────
    {
      name: "submittedAt",
      title: "Submitted At",
      type: "datetime",
      readOnly: true,
    },
  ],
  orderings: [
    {
      title: "Submitted, Newest First",
      name: "submittedDesc",
      by: [{ field: "submittedAt", direction: "desc" }],
    },
    {
      title: "Pending First",
      name: "pendingFirst",
      by: [
        { field: "status", direction: "asc" },
        { field: "submittedAt", direction: "desc" },
      ],
    },
  ],
  preview: {
    select: {
      name: "name",
      company: "company",
      status: "status",
      submittedAt: "submittedAt",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepare({ name, company, status, submittedAt }: any) {
      const date = submittedAt
        ? new Date(submittedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : ""
      const statusIcon =
        status === "approved" ? "✓" : status === "denied" ? "✗" : "○"
      return {
        title: `${statusIcon} ${name}${company ? ` — ${company}` : ""}`,
        subtitle: date,
      }
    },
  },
}
