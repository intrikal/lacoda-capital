import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ClientFormDialog } from "@/components/forms/client-form-dialog"

// Radix UI portals need a document.body in jsdom
// Testing Library renders into document.body by default — no extra config needed.

function renderDialog(
  props: Partial<React.ComponentProps<typeof ClientFormDialog>> = {}
) {
  const defaults = {
    mode: "create" as const,
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isPending: false,
  }
  return render(<ClientFormDialog {...defaults} {...props} />)
}

describe("ClientFormDialog — create mode", () => {
  it("renders the dialog title", () => {
    renderDialog()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Add New Client")).toBeInTheDocument()
  })

  it("renders all form fields", () => {
    renderDialog()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
  })

  it("calls onSubmit with valid data when form is submitted", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderDialog({ onSubmit })

    await user.type(screen.getByLabelText(/full name/i), "John Thompson")
    await user.type(screen.getByLabelText(/email/i), "john@example.com")
    await user.click(screen.getByRole("button", { name: /add client/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "John Thompson",
          email: "john@example.com",
        })
      )
    })
  })

  it("does NOT call onSubmit when name is empty", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderDialog({ onSubmit })

    await user.click(screen.getByRole("button", { name: /add client/i }))

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it("shows validation error for a single-character name after blur", async () => {
    const user = userEvent.setup()
    renderDialog()

    const nameInput = screen.getByLabelText(/full name/i)
    await user.type(nameInput, "A")
    await user.tab() // trigger blur → onBlur validation

    await waitFor(() => {
      expect(
        screen.getByText(/at least 2 characters/i)
      ).toBeInTheDocument()
    })
  })

  it("shows validation error for invalid email after blur", async () => {
    const user = userEvent.setup()
    renderDialog()

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, "not-an-email")
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    renderDialog({ onOpenChange })

    await user.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("shows loading state when isPending is true", () => {
    renderDialog({ isPending: true })
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled()
  })
})

describe("ClientFormDialog — edit mode", () => {
  it("renders 'Edit Client' title", () => {
    renderDialog({
      mode: "edit",
      initialData: {
        id: "client-1",
        displayName: "Alice Johnson",
        email: "alice@example.com",
        clientType: "individual",
        clientStatus: "active",
      },
    })
    expect(screen.getByText("Edit Client")).toBeInTheDocument()
  })

  it("pre-fills fields from initialData", () => {
    renderDialog({
      mode: "edit",
      initialData: {
        id: "client-1",
        displayName: "Alice Johnson",
        email: "alice@example.com",
        clientType: "individual",
        clientStatus: "active",
      },
    })
    expect(screen.getByDisplayValue("Alice Johnson")).toBeInTheDocument()
    expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument()
  })

  it("shows 'Save Changes' button in edit mode", () => {
    renderDialog({
      mode: "edit",
      initialData: { id: "client-1", displayName: "Alice" },
    })
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument()
  })
})
