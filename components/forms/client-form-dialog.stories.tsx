import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "@storybook/test"
import { ClientFormDialog } from "./client-form-dialog"

const meta = {
  title: "Forms/ClientFormDialog",
  component: ClientFormDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Modal dialog for creating and editing clients. Uses TanStack Form with Zod validation. Fields: display name (required), email, phone, type, status.",
      },
    },
  },
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: fn(),
    isPending: false,
  },
} satisfies Meta<typeof ClientFormDialog>

export default meta
type Story = StoryObj<typeof meta>

// ── Create mode ───────────────────────────────────────────────────────────────

export const CreateEmpty: Story = {
  name: "Create — empty",
  args: { mode: "create" },
}

export const CreatePending: Story = {
  name: "Create — saving",
  args: { mode: "create", isPending: true },
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

export const EditPrefilled: Story = {
  name: "Edit — pre-filled",
  args: {
    mode: "edit",
    initialData: {
      id: "client-1",
      displayName: "Alice Johnson",
      email: "alice@example.com",
      phone: "+1 555 000 0001",
      clientType: "individual",
      clientStatus: "active",
    },
  },
}

export const EditInstitution: Story = {
  name: "Edit — institution",
  args: {
    mode: "edit",
    initialData: {
      id: "client-2",
      displayName: "Brightstone Capital",
      email: "ops@brightstone.com",
      clientType: "institution",
      clientStatus: "prospect",
    },
  },
}

// ── Interaction test: valid submission ────────────────────────────────────────

export const SubmitValid: Story = {
  name: "Interaction — submit valid form",
  args: { mode: "create" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    // Fill in name
    await userEvent.type(canvas.getByLabelText(/full name/i), "John Thompson")
    // Fill in email
    await userEvent.type(canvas.getByLabelText(/email/i), "john@example.com")
    // Submit
    await userEvent.click(canvas.getByRole("button", { name: /add client/i }))

    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "John Thompson" })
    )
  },
}

// ── Interaction test: validation ──────────────────────────────────────────────

export const ValidationErrors: Story = {
  name: "Interaction — shows validation errors",
  args: { mode: "create" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Type a single character name then blur to trigger validation
    const nameInput = canvas.getByLabelText(/full name/i)
    await userEvent.type(nameInput, "A")
    await userEvent.tab()

    await expect(
      canvas.getByText(/at least 2 characters/i)
    ).toBeInTheDocument()

    // Type invalid email then blur
    const emailInput = canvas.getByLabelText(/email/i)
    await userEvent.type(emailInput, "bad-email")
    await userEvent.tab()

    await expect(canvas.getByText(/invalid email/i)).toBeInTheDocument()
  },
}
