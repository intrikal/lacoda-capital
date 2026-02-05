// Sanity Schema for Events
// Copy this to your Sanity Studio's schemas folder

export const eventSchema = {
  name: "event",
  title: "Events",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Event Title",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "date",
      title: "Start Date",
      type: "date",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "endDate",
      title: "End Date",
      type: "date",
      description: "Leave empty for single-day events",
    },
    {
      name: "time",
      title: "Time",
      type: "string",
      description: "e.g., 9:00 AM EST",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "location",
      title: "Location",
      type: "object",
      fields: [
        {
          name: "venue",
          title: "Venue",
          type: "string",
          validation: (Rule: any) => Rule.required(),
        },
        {
          name: "city",
          title: "City",
          type: "string",
          validation: (Rule: any) => Rule.required(),
        },
        {
          name: "country",
          title: "Country",
          type: "string",
          validation: (Rule: any) => Rule.required(),
        },
        {
          name: "isVirtual",
          title: "Virtual Event",
          type: "boolean",
          initialValue: false,
        },
      ],
    },
    {
      name: "eventType",
      title: "Event Type",
      type: "string",
      options: {
        list: [
          { title: "Speaking Engagement", value: "speaking" },
          { title: "Panel Discussion", value: "panel" },
          { title: "Workshop", value: "workshop" },
          { title: "Conference", value: "conference" },
          { title: "Webinar", value: "webinar" },
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "role",
      title: "Your Role",
      type: "string",
      options: {
        list: [
          { title: "Speaker", value: "speaker" },
          { title: "Panelist", value: "panelist" },
          { title: "Host", value: "host" },
          { title: "Attendee", value: "attendee" },
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "topic",
      title: "Talk/Session Topic",
      type: "string",
      description: "The title of your talk or session",
    },
    {
      name: "registrationUrl",
      title: "Registration URL",
      type: "url",
    },
    {
      name: "eventUrl",
      title: "Event Website URL",
      type: "url",
    },
    {
      name: "image",
      title: "Event Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
        },
      ],
    },
    {
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    },
    {
      name: "isFeatured",
      title: "Featured Event",
      type: "boolean",
      initialValue: false,
      description: "Show this event prominently on the events page",
    },
  ],
  orderings: [
    {
      title: "Event Date, Newest",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
    {
      title: "Event Date, Oldest",
      name: "dateAsc",
      by: [{ field: "date", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      date: "date",
      location: "location.city",
      media: "image",
    },
    prepare({ title, date, location, media }: any) {
      return {
        title,
        subtitle: `${date} - ${location}`,
        media,
      }
    },
  },
}
