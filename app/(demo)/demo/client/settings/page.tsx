"use client"

import { User, Bell, Shield, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

function SettingRow({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/40 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">{value}</span>
        <DemoMutationTooltip>
          <button className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600 px-2 py-1 rounded-md transition-colors">
            Edit
          </button>
        </DemoMutationTooltip>
      </div>
    </div>
  )
}

function ToggleRow({ label, enabled, description }: { label: string; enabled: boolean; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/40 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <DemoMutationTooltip>
        <button className={`relative inline-flex h-5 w-9 rounded-full border transition-colors ${enabled ? "bg-tiffany-500/30 border-tiffany-500/40" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${enabled ? "translate-x-4 bg-tiffany-500" : "translate-x-0.5 bg-zinc-400"}`} />
        </button>
      </DemoMutationTooltip>
    </div>
  )
}

interface SettingRowData {
  type: "setting"
  label: string
  value: string
  description?: string
}

interface ToggleRowData {
  type: "toggle"
  label: string
  enabled: boolean
  description?: string
}

type SectionRow = SettingRowData | ToggleRowData

const SECTIONS: Array<{
  title: string
  description: string
  icon: React.ReactNode
  rows: SectionRow[]
}> = [
  {
    title: "Profile",
    description: "Your personal information",
    icon: <User className="h-4 w-4 text-tiffany-500" />,
    rows: [
      { type: "setting", label: "Full name", value: "John Doe" },
      { type: "setting", label: "Email", value: "john.doe@example.com" },
      { type: "setting", label: "Phone", value: "+1 (555) 012-3456" },
      { type: "setting", label: "Date of birth", value: "Jan 12, 1978" },
    ],
  },
  {
    title: "Notifications",
    description: "How you receive updates",
    icon: <Bell className="h-4 w-4 text-amber-400" />,
    rows: [
      { type: "toggle", label: "Monthly statements", enabled: true, description: "Emailed when a new statement is available" },
      { type: "toggle", label: "Report ready alerts", enabled: true, description: "Notify when advisor generates a new report" },
      { type: "toggle", label: "Meeting reminders", enabled: true, description: "24-hour email reminder before scheduled meetings" },
      { type: "toggle", label: "Compliance alerts", enabled: false, description: "Notify of pending compliance items" },
    ],
  },
  {
    title: "Security",
    description: "Password and two-factor authentication",
    icon: <Shield className="h-4 w-4 text-emerald-400" />,
    rows: [
      { type: "setting", label: "Password", value: "••••••••••••" },
      { type: "toggle", label: "Two-factor authentication", enabled: true, description: "Authenticator app (Google Auth)" },
      { type: "toggle", label: "Login notifications", enabled: true, description: "Email on new device sign-in" },
    ],
  },
  {
    title: "Preferences",
    description: "Display and regional settings",
    icon: <Globe className="h-4 w-4 text-blue-400" />,
    rows: [
      { type: "setting", label: "Currency", value: "USD — US Dollar" },
      { type: "setting", label: "Time zone", value: "America/Los_Angeles (PST)" },
      { type: "setting", label: "Date format", value: "MM/DD/YYYY" },
    ],
  },
]

export default function DemoClientSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 mt-1 text-sm">Manage your account preferences</p>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              {section.icon}
              <div>
                <CardTitle className="text-sm">{section.title}</CardTitle>
                <CardDescription className="text-xs">{section.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {section.rows.map((row) =>
              row.type === "setting" ? (
                <SettingRow key={row.label} label={row.label} value={row.value} description={row.description} />
              ) : (
                <ToggleRow key={row.label} label={row.label} enabled={row.enabled} description={row.description} />
              )
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
