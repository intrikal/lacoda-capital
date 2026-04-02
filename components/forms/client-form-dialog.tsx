/**
 * ============================================================================
 * FILE: /components/forms/client-form-dialog.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   A React component that renders a MODAL DIALOG containing a FORM for
 *   creating or editing a client. It handles form state, validation, and
 *   submission.
 *
 * WHAT IS A MODAL DIALOG?
 *   A popup window that appears on top of the current page.
 *   It "blocks" interaction with the page behind it (you must close it
 *   or submit it before continuing). The dark overlay behind it is called
 *   a "backdrop" — clicking it closes the dialog.
 *
 * WHAT IS A FORM?
 *   An HTML element that collects user input (text fields, dropdowns, etc.)
 *   and submits it as structured data. Forms have:
 *     - Fields: text inputs, selects, checkboxes, etc.
 *     - Validation: rules that check if input is valid before submitting
 *     - Submit handler: function that runs when the user clicks "Submit"
 *
 * WHAT IS TanStack Form?
 *   A React library for managing form state. It handles:
 *     - Tracking what the user typed in each field
 *     - Running validation (checking rules) on blur (when a field loses focus)
 *     - Tracking which fields have errors
 *     - Handling form submission
 *
 *   Without a form library, you'd need a useState for every field,
 *   manual validation logic, error tracking, etc. Very tedious.
 *
 * TWO MODES:
 *   1. "create" — Empty form, creates a new client on submit
 *   2. "edit"   — Pre-filled with existing data, updates client on submit
 *
 * WHERE IS THIS USED?
 *   app/(dashboard)/app/clients/page.tsx renders this component.
 *   It passes mode, initialData, open state, and callbacks as props.
 *
 * DATA FLOW:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ User clicks "Add Client" on the page                            │
 *   │   ↓                                                              │
 *   │ Page sets: formOpen=true, formMode="create"                      │
 *   │   ↓                                                              │
 *   │ This Dialog opens (the `open` prop becomes true)                 │
 *   │   ↓                                                              │
 *   │ User fills in fields (TanStack Form tracks each keystroke)       │
 *   │   ↓                                                              │
 *   │ User clicks "Add Client" button                                  │
 *   │   ↓                                                              │
 *   │ form.handleSubmit() runs:                                        │
 *   │   1. Reads all field values                                      │
 *   │   2. Validates with createClientSchema (Zod)                     │
 *   │   3. If valid → calls onSubmit(data) prop                        │
 *   │   4. Closes the dialog                                           │
 *   │   ↓                                                              │
 *   │ Page's onSubmit calls createMutation.mutate(data)                │
 *   │   ↓                                                              │
 *   │ POST /api/clients is called, client list refreshes               │
 *   └──────────────────────────────────────────────────────────────────┘
 */

// ─── IMPORTS ────────────────────────────────────────────────────────────────────

/**
 * "use client" — This file runs in the browser (not the server).
 * Required because we use hooks (useForm) and event handlers (onClick).
 */
"use client"

/**
 * useForm — The main hook from TanStack Form.
 * Creates a form instance that tracks:
 *   - defaultValues: initial field values
 *   - validators: rules to check on submit
 *   - onSubmit: what to do when the form is submitted
 */
import { useForm } from "@tanstack/react-form"

/**
 * UI Components — Pre-built, styled components from our component library.
 * These are based on Radix UI primitives (accessible, unstyled components)
 * with our custom Tailwind CSS styling on top.
 *
 * Dialog*: The modal dialog container, header, title, description, footer.
 * Button: A clickable button with variants (default, outline, ghost).
 * Input: A text input field.
 * Label: A text label for a form field (e.g., "Full Name *").
 * Select*: A dropdown selector.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Validation schema and types from our shared validation file.
 * Used for both field-level validation (on blur) and form-level validation (on submit).
 */
import { createClientSchema } from "@/lib/validations/client.schema"
import type {
  ClientRecord,
  CreateClientInput,
  ClientType,
  ClientStatus,
} from "@/lib/validations/client.schema"
import { trackClientCreated } from "@/lib/analytics/track"


// ─── PROPS INTERFACE ────────────────────────────────────────────────────────────
/**
 * WHAT ARE PROPS?
 *   "Props" (properties) are the inputs a React component receives from its parent.
 *   Think of a component as a function and props as its arguments.
 *
 *   <ClientFormDialog mode="create" open={true} onSubmit={handleSubmit} />
 *     → mode, open, onSubmit are all PROPS passed to this component.
 *
 * WHY AN INTERFACE?
 *   TypeScript interfaces define the SHAPE of the props object.
 *   If the parent passes wrong types, TypeScript shows an error at compile time.
 */
interface ClientFormDialogProps {
  /** "create" for new client, "edit" for updating existing */
  mode: "create" | "edit"

  /** Existing client data to pre-fill the form in edit mode.
   * Partial<ClientRecord> means: some or all ClientRecord fields, all optional.
   * In create mode, this is undefined (empty form). */
  initialData?: Partial<ClientRecord>

  /** Whether the dialog is currently visible */
  open: boolean

  /** Callback to open/close the dialog. Called with `false` to close. */
  onOpenChange: (open: boolean) => void

  /** Callback when the form is submitted with valid data. */
  onSubmit: (data: CreateClientInput) => void

  /** Whether a save operation is currently in progress (shows loading state). */
  isPending?: boolean
}


// ─── FIELD ERROR HELPER ─────────────────────────────────────────────────────────
/**
 * FieldError — A small helper component that displays a validation error message.
 *
 * WHAT IS A COMPONENT?
 *   In React, a component is a function that returns JSX (HTML-like syntax).
 *   Components are the building blocks of the UI — everything you see is a component.
 *
 * WHAT DOES THIS DO?
 *   If there are errors: renders a small red error message below the input field.
 *   If no errors: renders nothing (null).
 *
 * @param errors — An array of error message strings.
 *   Example: ["Name must be at least 2 characters"]
 */
function FieldError({ errors }: { errors: string[] }) {
  // If the errors array is empty (length 0), render nothing.
  if (!errors.length) return null

  // Render the FIRST error message as a small red paragraph.
  // text-xs = extra small text size
  // text-rose-400 = rose/red color (400 = medium intensity)
  // mt-1 = margin-top of 0.25rem (small spacing above)
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}


// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
/**
 * ClientFormDialog — The exported component that other files import and use.
 *
 * `export` makes it available for import:
 *   import { ClientFormDialog } from "@/components/forms/client-form-dialog"
 *
 * Named export (with curly braces) vs default export:
 *   export function X → import { X } from "..."    (must use exact name)
 *   export default function X → import X from "..." (can rename freely)
 *   We use named exports because they're more explicit and refactor-friendly.
 */
export function ClientFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false, // Default value: false (if parent doesn't pass isPending)
}: ClientFormDialogProps) {

  // ── Initialize the form ─────────────────────────────────────────────────────
  /**
   * useForm() creates a form instance with:
   *
   * defaultValues — The initial values for each field.
   *   In "create" mode: mostly empty strings and defaults.
   *   In "edit" mode: pre-filled from initialData (the existing client).
   *
   *   ?? (nullish coalescing) provides fallbacks:
   *     initialData?.displayName ?? ""
   *     → If initialData exists AND has displayName, use it.
   *     → Otherwise, use empty string "".
   *
   * onSubmit — Called when the form passes validation and is submitted.
   *
   * validators — Form-level validation rules.
   */
  const form = useForm({
    defaultValues: {
      displayName: initialData?.displayName ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      clientType: (initialData?.clientType ?? "individual") as ClientType,
      clientStatus: (initialData?.clientStatus ?? "prospect") as ClientStatus,
    },

    /**
     * onSubmit — Runs when the user clicks the submit button.
     *
     * { value } is destructured from the submit event — it contains all field values.
     *
     * async ({ value }) => { ... }
     *   → An async arrow function. "async" allows us to use "await" inside.
     *   → Arrow functions (=>) are shorthand for function expressions.
     *
     * STEPS:
     * 1. Coerce empty strings to null for optional fields.
     *    WHY? The Zod schema expects null for "no email", but HTML inputs
     *    produce "" (empty string) when cleared. We bridge that gap.
     *
     * 2. Validate the full form data with createClientSchema.
     *    This catches any remaining errors that field-level validation missed.
     *
     * 3. If valid: call onSubmit(data) and close the dialog.
     *    If invalid: return early (do nothing).
     */
    onSubmit: async ({ value }) => {
      const parsed = createClientSchema.safeParse({
        ...value,
        email: value.email || null,   // "" → null (empty string to null)
        phone: value.phone || null,   // "" → null
      })
      if (!parsed.success) return     // Validation failed — don't submit
      if (mode === "create") trackClientCreated()
      onSubmit(parsed.data)           // Pass validated data to the parent
      onOpenChange(false)             // Close the dialog
    },

    /**
     * validators — Form-level validation (runs on submit).
     * This is a SECOND layer on top of field-level validation (on blur).
     * It ensures the entire form is valid before allowing submission.
     *
     * Return undefined = "no error" (valid)
     * Return string = "error message" (invalid)
     */
    validators: {
      onSubmit: ({ value }) => {
        const result = createClientSchema.safeParse(value)
        if (result.success) return undefined
        return "Please fix the errors above"
      },
    },
  })

  /**
   * handleOpenChange — Called when the dialog's open state changes.
   * If closing (next=false), reset the form to clear any typed data.
   * This prevents stale data when re-opening the dialog.
   */
  function handleOpenChange(next: boolean) {
    if (!next) form.reset()  // Reset all fields to defaultValues
    onOpenChange(next)       // Propagate the open/close to the parent
  }

  // ── RENDER THE DIALOG ──────────────────────────────────────────────────────
  /**
   * JSX — HTML-like syntax that React compiles to JavaScript.
   *
   * <Dialog open={open}> is JSX. Under the hood, it becomes:
   *   React.createElement(Dialog, { open: open })
   *
   * Key patterns used below:
   *
   * className="..." — The CSS classes to apply (Tailwind CSS utility classes).
   *   Each class maps to one CSS rule:
   *     bg-zinc-900 = background color: dark gray
   *     border-zinc-800 = border color: slightly lighter gray
   *     space-y-4 = vertical spacing between children (1rem)
   *
   * {condition ? valueA : valueB} — Ternary operator (inline if/else).
   *   mode === "create" ? "Add New Client" : "Edit Client"
   *   → If mode is "create", show "Add New Client", otherwise "Edit Client".
   *
   * <form.Field name="fieldName"> — TanStack Form's field component.
   *   It connects an input to the form state and provides:
   *     field.state.value — current value of this field
   *     field.handleChange — function to call when value changes
   *     field.handleBlur — function to call when field loses focus
   *     field.state.meta.errors — array of validation error messages
   *
   * validators.onBlur — Validation that runs when the field LOSES FOCUS.
   *   "Blur" = the moment you click away from an input field.
   *   This gives feedback without waiting for form submission.
   */
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Client" : "Edit Client"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new client to your book of business."
              : "Update client information."}
          </DialogDescription>
        </DialogHeader>

        {/* HTML <form> element — wraps all inputs and handles submission.
            e.preventDefault() stops the browser's default form behavior
            (which would cause a full page reload — we don't want that).
            Instead, we call form.handleSubmit() for a JavaScript-based submit. */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4 py-4"
          data-testid="client-form" // Used by automated tests to find this element
        >
          {/* ── Display Name Field ──────────────────────────────────────── */}
          <form.Field
            name="displayName"
            validators={{
              // onBlur validation: runs when user tabs/clicks away from this field.
              // Validates JUST this one field using the schema's shape.displayName rules.
              //
              // createClientSchema.shape.displayName → extracts the displayName validator
              //   (z.string().min(2).max(120).trim())
              //
              // .safeParse(value) → checks if the current value is valid.
              // If valid: return undefined (no error)
              // If invalid: return the first error message
              onBlur: ({ value }) => {
                const r = createClientSchema.shape.displayName.safeParse(value)
                return r.success ? undefined : r.error.issues[0].message
              },
            }}
          >
            {/* Render prop pattern: The child of form.Field is a FUNCTION
                that receives the field object and returns JSX.
                This gives us access to the field's state and handlers. */}
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="displayName">Full Name *</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., John Thompson"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="bg-zinc-800/50 border-zinc-700"
                  // aria-invalid — Accessibility attribute.
                  // Screen readers announce "invalid entry" when true.
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError
                  errors={field.state.meta.errors.filter(Boolean) as string[]}
                />
              </div>
            )}
          </form.Field>

          {/* ── Email + Phone (side by side) ────────────────────────────── */}
          {/* grid grid-cols-2 = CSS Grid with 2 equal columns.
              gap-4 = 1rem gap between columns. */}
          <div className="grid grid-cols-2 gap-4">
            {/* Email Field */}
            <form.Field
              name="email"
              validators={{
                onBlur: ({ value }) => {
                  // Only validate if the user typed something.
                  // Empty email is valid (it's optional).
                  if (!value) return undefined
                  const r = createClientSchema.shape.email.safeParse(value)
                  return r.success ? undefined : r.error.issues[0].message
                },
              }}
            >
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email" // Tells mobile browsers to show @ keyboard
                    placeholder="john@example.com"
                    value={field.state.value ?? ""}
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

            {/* Phone Field — no validation (phone formats vary too much) */}
            <form.Field name="phone">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 000-0000"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* ── Client Type + Status (side by side) ─────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Client Type Dropdown */}
            <form.Field name="clientType">
              {(field) => (
                <div className="space-y-1">
                  <Label>Type</Label>
                  {/* Select = dropdown component.
                      value = currently selected option.
                      onValueChange = callback when user selects a new option.
                      `as ClientType` tells TypeScript the string IS a ClientType. */}
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as ClientType)}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Client type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="institution">Institution</SelectItem>
                      <SelectItem value="trust">Trust</SelectItem>
                      <SelectItem value="fund">Fund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Client Status Dropdown */}
            <form.Field name="clientStatus">
              {(field) => (
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as ClientStatus)}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Client status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* ── Form Footer (Cancel + Submit buttons) ───────────────────── */}
          <DialogFooter>
            {/* Cancel button — type="button" prevents form submission.
                Without type="button", clicking this would submit the form
                (buttons inside forms default to type="submit"). */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>

            {/* Submit button — type="submit" triggers the <form> onSubmit.
                disabled={isPending} prevents double-clicks while saving.
                The label changes based on mode and loading state. */}
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving…"
                : mode === "create"
                ? "Add Client"
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
