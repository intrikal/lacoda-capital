// Sanity Schema — Availability Slot
// Add this to your Sanity Studio's schema list.
//
// You manage your open slots directly in Sanity Studio.
// Each slot has a date/time, duration, and a status that moves through:
//
//   available → pending (visitor requested it) → booked (you approved)
//                      └→ available again (you denied — slot reopens)

export const availabilitySlotSchema = {
  name: "availabilitySlot",
  title: "Availability Slots",
  type: "document",
  fields: [
    {
      name: "dateTime",
      title: "Date & Time",
      type: "datetime",
      description: "When the slot starts (include timezone)",
      options: {
        dateFormat: "MMMM D, YYYY",
        timeFormat: "h:mm A",
        timeStep: 15,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "duration",
      title: "Duration (minutes)",
      type: "number",
      description: "How long the call will be",
      options: {
        list: [
          { title: "15 minutes", value: 15 },
          { title: "30 minutes", value: 30 },
          { title: "45 minutes", value: 45 },
          { title: "60 minutes", value: 60 },
        ],
      },
      initialValue: 30,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "label",
      title: "Label",
      type: "string",
      description: 'Optional — e.g. "Discovery Call", "Follow-up"',
    },
    {
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Available", value: "available" },
          { title: "Pending (request received)", value: "pending" },
          { title: "Booked", value: "booked" },
        ],
        layout: "radio",
      },
      initialValue: "available",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "notes",
      title: "Internal Notes",
      type: "text",
      rows: 2,
      description: "Only visible to you in Studio",
    },
  ],
  orderings: [
    {
      title: "Date, Soonest First",
      name: "dateTimeAsc",
      by: [{ field: "dateTime", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      dateTime: "dateTime",
      duration: "duration",
      status: "status",
      label: "label",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepare({ dateTime, duration, status, label }: any) {
      const date = dateTime
        ? new Date(dateTime).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "No date"
      return {
        title: label ? `${label} — ${date}` : date,
        subtitle: `${duration} min · ${status}`,
      }
    },
  },
}
