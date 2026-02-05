"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import {
  Check,
  Building2,
  Users,
  Briefcase,
  Sparkles,
  ChevronUp,
  User,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/marketing/logo"

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema
// ─────────────────────────────────────────────────────────────────────────────

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  firmName: z.string().min(1),
  firmType: z.string().min(1),
  aumRange: z.string().min(1),
  teamSize: z.string().min(1),
  goals: z.array(z.string()).min(1),
})

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const firmTypes = [
  { id: "ria", label: "Registered Investment Advisor (RIA)", icon: Building2 },
  { id: "investment-firm", label: "Investment Firm", icon: Users },
  { id: "wealth-manager", label: "Wealth Management Firm", icon: Briefcase },
  { id: "family-office", label: "Family Office", icon: Users },
  { id: "other", label: "Other", icon: Building2 },
]

const aumRanges = [
  { id: "under-50m", label: "Under $50M" },
  { id: "50m-100m", label: "$50M - $100M" },
  { id: "100m-500m", label: "$100M - $500M" },
  { id: "500m-1b", label: "$500M - $1B" },
  { id: "over-1b", label: "Over $1B" },
]

const teamSizes = [
  { id: "solo", label: "Just me" },
  { id: "2-5", label: "2-5 people" },
  { id: "6-15", label: "6-15 people" },
  { id: "16-50", label: "16-50 people" },
  { id: "50+", label: "50+ people" },
]

const goalOptions = [
  { id: "client-management", label: "Better client management" },
  { id: "compliance", label: "Streamline compliance" },
  { id: "reporting", label: "Automated reporting" },
  { id: "document-management", label: "Document organization" },
  { id: "client-portal", label: "Client portal" },
  { id: "team-collaboration", label: "Team collaboration" },
  { id: "asset-tracking", label: "Asset tracking" },
  { id: "pipeline", label: "Deal pipeline management" },
]

const TOTAL_STEPS = 7

// Left panel content per step
const stepContent = [
  {
    title: "Let's get started",
    subtitle: "We'll personalize your workspace based on your needs",
    icon: User,
  },
  {
    title: "About your practice",
    subtitle: "Help us understand your firm",
    icon: Building2,
  },
  {
    title: "Your firm type",
    subtitle: "This helps us tailor features for you",
    icon: Briefcase,
  },
  {
    title: "Understanding scale",
    subtitle: "We'll configure the right tools for your AUM",
    icon: Target,
  },
  {
    title: "Building for your team",
    subtitle: "Collaboration features scale with you",
    icon: Users,
  },
  {
    title: "Your priorities",
    subtitle: "We'll highlight what matters most",
    icon: Target,
  },
  {
    title: "You're all set",
    subtitle: "Your workspace is ready",
    icon: Sparkles,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Slide Component - Typeform style with CSS
// ─────────────────────────────────────────────────────────────────────────────

function Slide({
  children,
  isActive,
  isPast,
}: {
  children: React.ReactNode
  isActive: boolean
  isPast: boolean
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center p-6 lg:p-12 transition-all duration-500 ease-out",
        isActive && "opacity-100 translate-y-0 pointer-events-auto",
        isPast && "opacity-0 -translate-y-full pointer-events-none",
        !isActive && !isPast && "opacity-0 translate-y-full pointer-events-none"
      )}
    >
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Component
// ─────────────────────────────────────────────────────────────────────────────

function Summary({
  data,
  step,
}: {
  data: {
    firstName: string
    lastName: string
    firmName: string
    firmType: string
    aumRange: string
    teamSize: string
    goals: string[]
  }
  step: number
}) {
  const items = [
    {
      label: "Name",
      value: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null,
      show: step > 0,
    },
    { label: "Firm", value: data.firmName || null, show: step > 1 },
    {
      label: "Type",
      value: firmTypes.find((t) => t.id === data.firmType)?.label || null,
      show: step > 2,
    },
    {
      label: "AUM",
      value: aumRanges.find((r) => r.id === data.aumRange)?.label || null,
      show: step > 3,
    },
    {
      label: "Team",
      value: teamSizes.find((s) => s.id === data.teamSize)?.label || null,
      show: step > 4,
    },
    {
      label: "Goals",
      value: data.goals.length > 0 ? `${data.goals.length} selected` : null,
      show: step > 5,
    },
  ].filter((item) => item.show && item.value)

  if (items.length === 0) return null

  return (
    <div className="space-y-3 mt-8 pt-6 border-t border-zinc-800">
      <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Your details</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="flex justify-between text-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="text-zinc-500">{item.label}</span>
            <span className="text-zinc-300">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [data, setData] = React.useState({
    firstName: "",
    lastName: "",
    firmName: "",
    firmType: "",
    aumRange: "",
    teamSize: "",
    goals: [] as string[],
  })

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const isValid = React.useCallback((): boolean => {
    switch (step) {
      case 0:
        return data.firstName.trim() !== "" && data.lastName.trim() !== ""
      case 1:
        return data.firmName.trim() !== ""
      case 2:
        return data.firmType !== ""
      case 3:
        return data.aumRange !== ""
      case 4:
        return data.teamSize !== ""
      case 5:
        return data.goals.length > 0
      case 6:
        return true
      default:
        return false
    }
  }, [step, data])

  const next = React.useCallback(() => {
    if (step === TOTAL_STEPS - 1) {
      if (onboardingSchema.safeParse(data).success) {
        router.push("/app")
      }
    } else if (isValid()) {
      setStep((s) => s + 1)
    }
  }, [step, data, router, isValid])

  const back = React.useCallback(() => {
    if (step > 0) setStep((s) => s - 1)
  }, [step])

  const toggleGoal = (id: string) => {
    setData((d) => ({
      ...d,
      goals: d.goals.includes(id) ? d.goals.filter((g) => g !== id) : [...d.goals, id],
    }))
  }

  // Keyboard: Enter to continue
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isValid()) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [next, isValid])

  const currentContent = stepContent[step]
  const IconComponent = currentContent.icon

  return (
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] bg-zinc-900 relative flex-col">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-10">
          <Logo size="md" />

          <div className="flex-1 flex flex-col justify-center">
            <div key={step} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-tiffany-500/10 flex items-center justify-center">
                  <IconComponent className="h-5 w-5 text-tiffany-500" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-3">{currentContent.title}</h2>
              <p className="text-lg text-zinc-400">{currentContent.subtitle}</p>
            </div>

            <Summary data={data} step={step} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Step {step + 1} of {TOTAL_STEPS}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-tiffany-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Slides */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden p-4 border-b border-zinc-800 shrink-0">
          <Logo size="sm" />
          <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-tiffany-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Slides Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Slide 0: Name */}
          <Slide isActive={step === 0} isPast={step > 0}>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">What's your name?</h1>
                <p className="text-zinc-400">Let's personalize your experience</p>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="First name"
                  value={data.firstName}
                  onChange={(e) => setData((d) => ({ ...d, firstName: e.target.value }))}
                  className="h-12 bg-zinc-900 border-zinc-700 focus:border-tiffany-500"
                  autoFocus={step === 0}
                />
                <Input
                  placeholder="Last name"
                  value={data.lastName}
                  onChange={(e) => setData((d) => ({ ...d, lastName: e.target.value }))}
                  className="h-12 bg-zinc-900 border-zinc-700 focus:border-tiffany-500"
                />
              </div>
              <ContinueButton onClick={next} disabled={!isValid()} />
            </div>
          </Slide>

          {/* Slide 1: Firm Name */}
          <Slide isActive={step === 1} isPast={step > 1}>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">Hi {data.firstName}!</h1>
                <p className="text-zinc-400">What's your firm called?</p>
              </div>
              <Input
                placeholder="Firm name"
                value={data.firmName}
                onChange={(e) => setData((d) => ({ ...d, firmName: e.target.value }))}
                className="h-12 bg-zinc-900 border-zinc-700 focus:border-tiffany-500"
                autoFocus={step === 1}
              />
              <div className="flex gap-3">
                <BackButton onClick={back} />
                <ContinueButton onClick={next} disabled={!isValid()} />
              </div>
            </div>
          </Slide>

          {/* Slide 2: Firm Type */}
          <Slide isActive={step === 2} isPast={step > 2}>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">What type of firm?</h1>
                <p className="text-zinc-400">Select the best match</p>
              </div>
              <div className="space-y-2">
                {firmTypes.map((type, index) => (
                  <button
                    key={type.id}
                    onClick={() => setData((d) => ({ ...d, firmType: type.id }))}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all duration-200",
                      "animate-in fade-in slide-in-from-bottom-2",
                      data.firmType === type.id
                        ? "border-tiffany-500 bg-tiffany-500/10"
                        : "border-zinc-800 hover:border-zinc-700"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <type.icon
                      className={cn(
                        "h-5 w-5",
                        data.firmType === type.id ? "text-tiffany-500" : "text-zinc-500"
                      )}
                    />
                    <span className={data.firmType === type.id ? "text-zinc-100" : "text-zinc-300"}>
                      {type.label}
                    </span>
                    {data.firmType === type.id && (
                      <Check className="h-4 w-4 text-tiffany-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <BackButton onClick={back} />
                <ContinueButton onClick={next} disabled={!isValid()} />
              </div>
            </div>
          </Slide>

          {/* Slide 3: AUM */}
          <Slide isActive={step === 3} isPast={step > 3}>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">Assets under management?</h1>
                <p className="text-zinc-400">Approximate range</p>
              </div>
              <div className="space-y-2">
                {aumRanges.map((range, index) => (
                  <button
                    key={range.id}
                    onClick={() => setData((d) => ({ ...d, aumRange: range.id }))}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all duration-200",
                      "animate-in fade-in slide-in-from-bottom-2",
                      data.aumRange === range.id
                        ? "border-tiffany-500 bg-tiffany-500/10 text-zinc-100"
                        : "border-zinc-800 hover:border-zinc-700 text-zinc-300"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <BackButton onClick={back} />
                <ContinueButton onClick={next} disabled={!isValid()} />
              </div>
            </div>
          </Slide>

          {/* Slide 4: Team Size */}
          <Slide isActive={step === 4} isPast={step > 4}>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">Team size?</h1>
                <p className="text-zinc-400">Including all staff</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {teamSizes.map((size, index) => (
                  <button
                    key={size.id}
                    onClick={() => setData((d) => ({ ...d, teamSize: size.id }))}
                    className={cn(
                      "p-4 rounded-lg border text-center transition-all duration-200",
                      "animate-in fade-in slide-in-from-bottom-2",
                      data.teamSize === size.id
                        ? "border-tiffany-500 bg-tiffany-500/10 text-zinc-100"
                        : "border-zinc-800 hover:border-zinc-700 text-zinc-300"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <BackButton onClick={back} />
                <ContinueButton onClick={next} disabled={!isValid()} />
              </div>
            </div>
          </Slide>

          {/* Slide 5: Goals */}
          <Slide isActive={step === 5} isPast={step > 5}>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">What are your goals?</h1>
                <p className="text-zinc-400">Select all that apply</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {goalOptions.map((goal, index) => {
                  const selected = data.goals.includes(goal.id)
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200",
                        "animate-in fade-in slide-in-from-bottom-2",
                        selected
                          ? "border-tiffany-500 bg-tiffany-500/10"
                          : "border-zinc-800 hover:border-zinc-700"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                          selected ? "border-tiffany-500 bg-tiffany-500" : "border-zinc-600"
                        )}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={cn("text-sm", selected ? "text-zinc-100" : "text-zinc-300")}>
                        {goal.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <BackButton onClick={back} />
                <ContinueButton onClick={next} disabled={!isValid()} />
              </div>
            </div>
          </Slide>

          {/* Slide 6: Complete */}
          <Slide isActive={step === 6} isPast={step > 6}>
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-tiffany-500 flex items-center justify-center animate-in zoom-in duration-300">
                <Check className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">
                  You're all set{data.firstName ? `, ${data.firstName}` : ""}!
                </h1>
                <p className="text-zinc-400">
                  Your workspace for {data.firmName || "your firm"} is ready.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <BackButton onClick={back} />
                <Button onClick={next} className="bg-tiffany-500 hover:bg-tiffany-600">
                  Get Started
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </Slide>
        </div>

        {/* Keyboard hint */}
        <div className="p-4 text-center text-zinc-600 text-sm shrink-0">
          Press <kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">Enter ↵</kbd> to
          continue
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Button Components
// ─────────────────────────────────────────────────────────────────────────────

function ContinueButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled} className="flex-1 gap-2">
      OK
      <Check className="h-4 w-4" />
    </Button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      size="icon"
      className="text-zinc-500 hover:text-zinc-300"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  )
}
