"use client"

/**
 * BookingRequestForm
 *
 * Public form on the /schedule page. Visitors pick an available slot,
 * fill in their info, and submit. Creates a bookingRequest in Sanity
 * and marks the slot as "pending" until you approve or deny it in Studio.
 *
 * Props:
 *   slots — passed from the server component (pre-fetched, always fresh)
 */

import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { bookingRequestSchema } from "@/lib/validations/booking.schema"

interface SanitySlot {
  _id: string
  dateTime: string
  label?: string
  duration: number
  status: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSlot(slot: SanitySlot): string {
  const date = new Date(slot.dateTime)
  const formatted = date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })
  return slot.label
    ? `${slot.label} — ${formatted} (${slot.duration} min)`
    : `${formatted} (${slot.duration} min)`
}

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

// ─── Component ───────────────────────────────────────────────────────────────

interface BookingRequestFormProps {
  slots: SanitySlot[]
}

type SubmitState = "idle" | "pending" | "success" | "error"

export function BookingRequestForm({ slots }: BookingRequestFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle")

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      company: "",
      reason: "",
      slotId: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = bookingRequestSchema.safeParse(value)
      if (!parsed.success) return

      setSubmitState("pending")

      try {
        const res = await fetch("/api/v1/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        })

        if (!res.ok) throw new Error("Submission failed")
        setSubmitState("success")
      } catch {
        setSubmitState("error")
      }
    },
  })

  if (submitState === "success") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-2">
        <p className="text-lg font-medium text-zinc-100">Request received</p>
        <p className="text-sm text-zinc-400">
          I&apos;ll review your request and send you a confirmation email
          shortly.
        </p>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-sm text-zinc-400">
          No open slots right now. Check back soon.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-6"
    >
      {/* Slot picker */}
      <form.Field
        name="slotId"
        validators={{
          onBlur: ({ value }) => (!value ? "Please select a time slot" : undefined),
        }}
      >
        {(field) => (
          <div className="space-y-2">
            <Label>Select a time *</Label>
            <div className="grid gap-2">
              {slots.map((slot) => {
                const selected = field.state.value === slot._id
                return (
                  <button
                    key={slot._id}
                    type="button"
                    onClick={() => field.handleChange(slot._id)}
                    className={[
                      "w-full rounded-md border px-4 py-3 text-left text-sm transition-colors",
                      selected
                        ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
                    ].join(" ")}
                  >
                    {formatSlot(slot)}
                  </button>
                )
              })}
            </div>
            <FieldError
              errors={field.state.meta.errors.filter(Boolean) as string[]}
            />
          </div>
        )}
      </form.Field>

      {/* Name */}
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => (!value.trim() ? "Name is required" : undefined),
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="booking-name">Name *</Label>
            <Input
              id="booking-name"
              placeholder="Jane Smith"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="bg-zinc-800/50 border-zinc-700"
            />
            <FieldError
              errors={field.state.meta.errors.filter(Boolean) as string[]}
            />
          </div>
        )}
      </form.Field>

      {/* Email */}
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            if (!value.trim()) return "Email is required"
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
              return "Enter a valid email address"
            return undefined
          },
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="booking-email">Email *</Label>
            <Input
              id="booking-email"
              type="email"
              placeholder="jane@company.com"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="bg-zinc-800/50 border-zinc-700"
            />
            <FieldError
              errors={field.state.meta.errors.filter(Boolean) as string[]}
            />
          </div>
        )}
      </form.Field>

      {/* Company (optional) */}
      <form.Field name="company">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="booking-company">
              Company{" "}
              <span className="text-zinc-500 font-normal">(optional)</span>
            </Label>
            <Input
              id="booking-company"
              placeholder="Acme Corp"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        )}
      </form.Field>

      {/* Reason */}
      <form.Field
        name="reason"
        validators={{
          onBlur: ({ value }) => {
            if (!value.trim()) return "Please share why you'd like to connect"
            if (value.trim().length < 10)
              return "Please share a bit more detail"
            return undefined
          },
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="booking-reason">
              What would you like to discuss? *
            </Label>
            <Textarea
              id="booking-reason"
              placeholder="A brief description of what you'd like to talk about..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={4}
              className="bg-zinc-800/50 border-zinc-700 resize-none"
            />
            <FieldError
              errors={field.state.meta.errors.filter(Boolean) as string[]}
            />
          </div>
        )}
      </form.Field>

      {submitState === "error" && (
        <p className="text-sm text-rose-400">
          Something went wrong. Please try again.
        </p>
      )}

      <Button
        type="submit"
        disabled={submitState === "pending"}
        className="w-full"
      >
        {submitState === "pending" ? "Submitting…" : "Request this slot"}
      </Button>
    </form>
  )
}
