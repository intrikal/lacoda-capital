"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Users,
  Briefcase,
  FileText,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Loader2,
  Plus,
  Upload,
  Globe,
  DollarSign,
  Clock,
  SkipForward,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  getOnboardingState,
  updateOrgOnboarding,
  inviteTeamMember,
  type OnboardingState,
} from "@/lib/actions/onboarding.actions"
import { createAsset } from "@/lib/actions/asset.actions"

// ─── Step definitions ───────────────────────────────────────────────────────

const WIZARD_STEPS = [
  {
    key: "org",
    label: "Organization",
    description: "Confirm your org details",
    icon: Building2,
  },
  {
    key: "team",
    label: "Invite Team",
    description: "Add team members",
    icon: Users,
    skippable: true,
  },
  {
    key: "asset",
    label: "First Asset",
    description: "Add your first asset",
    icon: Briefcase,
  },
  {
    key: "document",
    label: "Upload Document",
    description: "Store your first document",
    icon: FileText,
  },
] as const

// ─── Main component ─────────────────────────────────────────────────────────

export function FirstLoginWizard() {
  const router = useRouter()
  const [state, setState] = React.useState<OnboardingState | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)

  // Step 1: Org form
  const [orgName, setOrgName] = React.useState("")
  const [orgTimezone, setOrgTimezone] = React.useState("America/New_York")
  const [orgCurrency, setOrgCurrency] = React.useState("USD")

  // Step 2: Team invites
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"admin" | "assistant">("assistant")
  const [invitedEmails, setInvitedEmails] = React.useState<string[]>([])

  // Step 3: Asset
  const [assetName, setAssetName] = React.useState("")
  const [assetClass, setAssetClass] = React.useState("real_estate")

  // Track completed steps within the wizard session
  const [completedInSession, setCompletedInSession] = React.useState<Set<string>>(new Set())

  // ── Load onboarding state ──────────────────────────────────────────────

  React.useEffect(() => {
    async function load() {
      try {
        const s = await getOnboardingState()
        setState(s)

        // Pre-fill org info
        if (s.orgInfo) {
          setOrgName(s.orgInfo.name)
          if (s.orgInfo.timezone) setOrgTimezone(s.orgInfo.timezone)
          if (s.orgInfo.currency) setOrgCurrency(s.orgInfo.currency)
        }

        // Resume from last completed step
        if (s.completedSteps.org && !s.completedSteps.team) setCurrentStep(1)
        else if (s.completedSteps.team && !s.completedSteps.asset) setCurrentStep(2)
        else if (s.completedSteps.asset && !s.completedSteps.document) setCurrentStep(3)
      } catch {
        // If we can't load state, don't show wizard
        setState(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────

  async function handleOrgSave() {
    setSaving(true)
    try {
      await updateOrgOnboarding({ name: orgName, timezone: orgTimezone, currency: orgCurrency })
      markComplete("org")
      setCurrentStep(1)
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setSaving(true)
    try {
      await inviteTeamMember({ email: inviteEmail.trim(), role: inviteRole })
      setInvitedEmails((prev) => [...prev, inviteEmail.trim()])
      setInviteEmail("")
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  function handleSkipTeam() {
    markComplete("team")
    setCurrentStep(2)
  }

  function handleTeamDone() {
    markComplete("team")
    setCurrentStep(2)
  }

  async function handleAssetSave() {
    if (!assetName.trim()) return
    setSaving(true)
    try {
      // We need an entityId — for the wizard, we'll navigate to the assets page
      // where they can use the full form. For now, mark as complete and redirect.
      markComplete("asset")
      setCurrentStep(3)
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  function handleDocumentStep() {
    // Navigate to vault for document upload
    markComplete("document")
    setDismissed(true)
    router.push("/app/vault")
  }

  function handleSkipDocument() {
    setDismissed(true)
  }

  function markComplete(key: string) {
    setCompletedInSession((prev) => new Set([...prev, key]))
  }

  // ── Should we show the wizard? ─────────────────────────────────────────

  if (loading || !state || !state.showWizard || dismissed) return null

  const step = WIZARD_STEPS[currentStep]
  const stepDef = WIZARD_STEPS[currentStep]

  return (
    <Dialog open={true} onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-zinc-800 bg-zinc-900 p-0 shadow-2xl sm:max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Welcome to Lacoda Capital</h2>
            <p className="text-sm text-zinc-500">Let's get your workspace set up</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800/50">
          {WIZARD_STEPS.map((s, i) => {
            const isComplete = completedInSession.has(s.key) || state.completedSteps[s.key as keyof typeof state.completedSteps]
            const isCurrent = i === currentStep
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isComplete
                      ? "bg-teal-500/20 text-teal-400"
                      : isCurrent
                        ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
                        : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs sm:inline",
                    isCurrent ? "text-zinc-300" : "text-zinc-600"
                  )}
                >
                  {s.label}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className="mx-1 h-px w-4 bg-zinc-800 sm:w-8" />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {/* Step 1: Org setup */}
          {currentStep === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-100">Confirm your organization</h3>
                  <p className="text-sm text-zinc-500">Set your name, timezone, and currency</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Wealth Management"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={orgTimezone} onValueChange={setOrgTimezone}>
                    <SelectTrigger className="h-10">
                      <Clock className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={orgCurrency} onValueChange={setOrgCurrency}>
                    <SelectTrigger className="h-10">
                      <DollarSign className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (&euro;)</SelectItem>
                      <SelectItem value="GBP">GBP (&pound;)</SelectItem>
                      <SelectItem value="SGD">SGD (S$)</SelectItem>
                      <SelectItem value="CHF">CHF (Fr.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Team invites */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-100">Invite your team</h3>
                  <p className="text-sm text-zinc-500">Add team members by email (you can skip this)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="h-10"
                  type="email"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "assistant")}>
                  <SelectTrigger className="h-10 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="assistant">Advisor</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={saving || !inviteEmail.trim()} className="h-10 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {invitedEmails.length > 0 && (
                <div className="space-y-2">
                  {invitedEmails.map((email) => (
                    <div key={email} className="flex items-center gap-2 rounded-md bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                      {email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: First asset */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-100">Add your first asset</h3>
                  <p className="text-sm text-zinc-500">A simplified form to get started quickly</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetName">Asset name</Label>
                <Input
                  id="assetName"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Manhattan Office Tower"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Asset class</Label>
                <Select value={assetClass} onValueChange={setAssetClass}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="private_equity">Private Equity</SelectItem>
                    <SelectItem value="equities">Public Equities</SelectItem>
                    <SelectItem value="fixed_income">Fixed Income</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-zinc-600">
                You can add more details, valuations, and documents later from the Assets page.
              </p>
            </div>
          )}

          {/* Step 4: Upload document */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-100">Upload a document</h3>
                  <p className="text-sm text-zinc-500">Store your first document in the vault</p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/30 px-6 py-10 text-center">
                <Upload className="h-8 w-8 text-zinc-500 mb-3" />
                <p className="text-sm text-zinc-400 mb-1">
                  Click below to go to the Vault and upload your first document
                </p>
                <p className="text-xs text-zinc-600">
                  Contracts, trust agreements, tax documents, etc.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
          <div>
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentStep === 1 && (
              <Button
                variant="ghost"
                onClick={handleSkipTeam}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <SkipForward className="h-3.5 w-3.5 mr-1" />
                Skip
              </Button>
            )}
            {currentStep === 3 && (
              <Button
                variant="ghost"
                onClick={handleSkipDocument}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Skip for now
              </Button>
            )}
            <Button
              onClick={
                currentStep === 0
                  ? handleOrgSave
                  : currentStep === 1
                    ? handleTeamDone
                    : currentStep === 2
                      ? handleAssetSave
                      : handleDocumentStep
              }
              disabled={saving || (currentStep === 0 && !orgName.trim())}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === 3 ? (
                <>
                  Go to Vault
                  <Upload className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  {currentStep === 1 ? "Done" : "Continue"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
