"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Users,
  Shield,
  BarChart3,
  Briefcase,
  FileText,
  Wallet,
  GitBranch,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Globe,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/marketing/logo"
import { createClient } from "@/utils/supabase/client"

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────

type StepDef = {
  eyebrow: string
  heading: string
  subheading: string
  icon: React.ElementType
  title: string
  description: string
  type?: "profile"
  features: {
    icon: React.ElementType
    label: string
    description: string
  }[]
}

const steps: StepDef[] = [
  {
    // Left panel
    eyebrow: "Step 1 of 6",
    heading: "Your command\ncenter is ready.",
    subheading:
      "A quick walkthrough before you dive in. We'll cover everything that's waiting for you.",
    // Right panel
    icon: Sparkles,
    title: "Welcome to Lacoda Capital",
    description:
      "Lacoda is an all-in-one platform built for wealth management firms — from client onboarding to compliance, all in one place.",
    features: [
      {
        icon: Users,
        label: "Client management",
        description:
          "Onboard clients, manage profiles, and track every relationship across your firm.",
      },
      {
        icon: Briefcase,
        label: "Asset & portfolio tracking",
        description:
          "Monitor assets, entities, and valuations with a full audit trail.",
      },
      {
        icon: GitBranch,
        label: "Investment flow",
        description:
          "Track investment mandates and capital deployment from inception to close.",
      },
    ],
  },
  {
    eyebrow: "Step 2 of 6",
    heading: "Every client,\norganized.",
    subheading:
      "A single source of truth for your entire book of business — clients, entities, and assets.",
    icon: Users,
    title: "Clients, entities & assets",
    description:
      "Model your clients' full financial picture: individual profiles, entity hierarchies, asset assignments, and valuation history.",
    features: [
      {
        icon: Users,
        label: "Client profiles",
        description:
          "Store contact info, documents, notes, and activity history for every client.",
      },
      {
        icon: Briefcase,
        label: "Entity hierarchies",
        description:
          "Model LLCs, trusts, and holding structures nested under each client.",
      },
      {
        icon: Wallet,
        label: "Asset valuations",
        description:
          "Log valuations over time and generate performance snapshots.",
      },
    ],
  },
  {
    eyebrow: "Step 3 of 6",
    heading: "Stay audit-ready,\nalways.",
    subheading:
      "Compliance and reporting built into the platform's foundation — so your audit trail is always current.",
    icon: Shield,
    title: "Compliance & reporting",
    description:
      "Track regulatory requirements, manage documents, generate client-ready reports, and keep a full ledger of every financial event.",
    features: [
      {
        icon: Shield,
        label: "Compliance controls",
        description:
          "Assign controls, log evidence, and audit your compliance posture.",
      },
      {
        icon: BarChart3,
        label: "Automated reports",
        description:
          "Generate branded client reports and internal analytics on demand.",
      },
      {
        icon: FileText,
        label: "Document vault",
        description:
          "Store all firm and client documents with version history and access controls.",
      },
    ],
  },
  {
    eyebrow: "Step 4 of 6",
    heading: "Your clients get\na portal too.",
    subheading:
      "Every client you add gets their own secure login to see their portfolio — you control what they see.",
    icon: Globe,
    title: "The client portal",
    description:
      "When you're ready to invite a client, they get access to a private, read-only view of their own data — nothing else.",
    features: [
      {
        icon: BarChart3,
        label: "Portfolio summary",
        description:
          "Clients see their assets, valuations, and performance in a clean dashboard.",
      },
      {
        icon: FileText,
        label: "Shared documents",
        description:
          "Only documents you explicitly share appear in their portal — full privacy by default.",
      },
      {
        icon: BookOpen,
        label: "Client-ready reports",
        description:
          "Reports you generate are delivered directly to the client's portal.",
      },
    ],
  },
  {
    eyebrow: "Step 5 of 6",
    heading: "A few more\nthings.",
    subheading:
      "A few more places to get familiar with before you jump in.",
    icon: Calendar,
    title: "Calendar, tasks & more",
    description:
      "A few more places to get familiar with right away:",
    features: [
      {
        icon: Calendar,
        label: "Calendar & tasks",
        description:
          "Stay on top of client meetings, follow-ups, and team tasks.",
      },
      {
        icon: MessageSquare,
        label: "Messaging",
        description:
          "Communicate with clients and your team directly inside the platform.",
      },
      {
        icon: BookOpen,
        label: "Help & documentation",
        description:
          "Full guides and references are available in the Help section.",
      },
    ],
  },
  {
    eyebrow: "Step 6 of 6",
    heading: "One last step.\nSet up your profile.",
    subheading:
      "Add your name so teammates and clients know who you are. You can update this anytime from Settings.",
    icon: User,
    title: "Your profile",
    description:
      "This is how you'll appear to teammates and in client-facing communications.",
    type: "profile",
    features: [],
  },
]

const TOTAL_STEPS = steps.length

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  // Separate from the step flow — shows a completion screen before launching
  const [isComplete, setIsComplete] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isLaunching, setIsLaunching] = React.useState(false)
  const [animating, setAnimating] = React.useState(false)

  // Profile step state
  const [profileName, setProfileName] = React.useState("")
  const [profilePhone, setProfilePhone] = React.useState("")

  // Pre-fill profile fields from existing user metadata
  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setProfileName(user.user_metadata.full_name)
      }
      if (user?.user_metadata?.phone) {
        setProfilePhone(user.user_metadata.phone)
      }
    }
    fetchUser()
  }, [])

  const current = steps[step]
  const isLast = step === TOTAL_STEPS - 1

  const goTo = (next: number) => {
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 150)
  }

  const handleNext = async () => {
    if (isLast) {
      // Save profile info + mark onboarding complete, then show completion screen
      setIsSaving(true)
      const supabase = createClient()
      const updateData: Record<string, unknown> = { onboarding_completed: true }
      if (profileName.trim()) updateData.full_name = profileName.trim()
      if (profilePhone.trim()) updateData.phone = profilePhone.trim()
      await supabase.auth.updateUser({ data: updateData })
      setIsSaving(false)
      setIsComplete(true)
    } else {
      goTo(step + 1)
    }
  }

  const handleBack = () => {
    if (isComplete) {
      // Back from completion screen returns to the last step
      setIsComplete(false)
    } else if (step > 0) {
      goTo(step - 1)
    }
  }

  const handleLaunch = () => {
    setIsLaunching(true)
    router.push("/app")
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-900 relative flex-col">
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-tiffany-500/5 via-transparent to-cyan-500/5" />

        <div className="relative z-10 flex flex-col h-full p-10">
          <Link href="/">
            <Logo size="md" />
          </Link>

          {/* Progress bar — fully filled on completion screen */}
          <div className="mt-8 flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  isComplete ? "bg-tiffany-500 w-4" :
                  i < step ? "bg-tiffany-500 w-4" :
                  i === step ? "bg-tiffany-500 w-8" :
                  "bg-zinc-700 w-4"
                )}
              />
            ))}
          </div>

          {/* Dynamic copy per step — or completion state */}
          <div className="flex-1 flex flex-col justify-center">
            {isComplete ? (
              <>
                <p className="text-sm font-medium text-tiffany-500 mb-3 uppercase tracking-wider">
                  Complete
                </p>
                <h2 className="text-4xl font-bold text-zinc-100 mb-4 leading-tight">
                  Ready when<br />you are.
                </h2>
                <p className="text-lg text-zinc-400 max-w-md">
                  Open your dashboard when you're ready. You can revisit this
                  walkthrough anytime from Settings.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-tiffany-500 mb-3 uppercase tracking-wider">
                  {current.eyebrow}
                </p>
                <h2 className="text-4xl font-bold text-zinc-100 mb-4 whitespace-pre-line leading-tight">
                  {current.heading}
                </h2>
                <p className="text-lg text-zinc-400 max-w-md">
                  {current.subheading}
                </p>
              </>
            )}
          </div>

          <p className="text-zinc-600 text-sm">
            Lacoda Capital — Private access
          </p>
        </div>
      </div>

      {/* Right Panel — Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-6 border-b border-zinc-800">
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">

          {/* ── Completion screen ── */}
          {isComplete ? (
            <div className="w-full max-w-md">
              <div className="w-14 h-14 rounded-full bg-tiffany-500/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-7 h-7 text-tiffany-500" />
              </div>

              <h1 className="text-2xl font-bold text-zinc-100 mb-3">
                You're all set
              </h1>
              <p className="text-zinc-400 mb-10">
                The walkthrough is complete. Your dashboard is ready whenever
                you are — take your time, or jump straight in.
              </p>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-5 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                  onClick={handleBack}
                  disabled={isLaunching}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
                  onClick={handleLaunch}
                  disabled={isLaunching}
                >
                  {isLaunching ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Open dashboard
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (

          /* ── Step content ── */
          <div
            className={cn(
              "w-full max-w-md transition-all duration-150",
              animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}
          >
            {/* Step icon */}
            <div className="w-12 h-12 rounded-xl bg-tiffany-500/10 flex items-center justify-center mb-6">
              <current.icon className="w-6 h-6 text-tiffany-500" />
            </div>

            <h1 className="text-2xl font-bold text-zinc-100 mb-3">
              {current.title}
            </h1>
            <p className="text-zinc-400 mb-8">
              {current.description}
            </p>

            {/* Profile step: form inputs */}
            {current.type === "profile" ? (
              <div className="space-y-5 mb-10">
                <div className="space-y-2">
                  <Label htmlFor="profileName">Full name</Label>
                  <Input
                    id="profileName"
                    type="text"
                    placeholder="Kevin Smith"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="h-11"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profilePhone">
                    Phone number{" "}
                    <span className="text-zinc-500 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="profilePhone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            ) : (
              /* Info steps: feature list */
              <div className="space-y-5 mb-10">
                {current.features.map((feature) => (
                  <div key={feature.label} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <feature.icon className="w-4 h-4 text-tiffany-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200 mb-0.5">
                        {feature.label}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-5 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                  onClick={handleBack}
                  disabled={isSaving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                className="flex-1 h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
                onClick={handleNext}
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLast ? "Complete setup" : "Next"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Mobile step indicator */}
            <div className="lg:hidden flex justify-center gap-1.5 mt-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-5 bg-tiffany-500" : "w-1.5 bg-zinc-700"
                  )}
                />
              ))}
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  )
}
