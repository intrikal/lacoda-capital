"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Search,
  Shield,
  FileText,
  Video,
  Clock,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const gettingStartedSteps = [
  {
    title: "Add your first asset",
    description: "Import or manually add an asset to your portfolio",
    completed: true,
    link: "/app/assets",
  },
  {
    title: "Upload key documents",
    description: "Store important documents in your secure vault",
    completed: true,
    link: "/app/vault",
  },
  {
    title: "Set up your team",
    description: "Invite team members and configure permissions",
    completed: false,
    link: "/app/settings",
  },
  {
    title: "Generate your first report",
    description: "Create a portfolio summary or performance report",
    completed: false,
    link: "/app/reports",
  },
  {
    title: "Review compliance controls",
    description: "Ensure your organization meets security standards",
    completed: false,
    link: "/app/compliance",
  },
]

const quickLinks = [
  {
    title: "Asset Management",
    description: "Add, edit, and track your portfolio assets",
    icon: FileText,
    links: [
      { label: "Adding a new asset", href: "#" },
      { label: "Updating valuations", href: "#" },
      { label: "Asset categories explained", href: "#" },
    ],
  },
  {
    title: "Document Vault",
    description: "Securely store and manage documents",
    icon: Shield,
    links: [
      { label: "Uploading documents", href: "#" },
      { label: "Setting expiration alerts", href: "#" },
      { label: "Sharing with permissions", href: "#" },
    ],
  },
  {
    title: "Reports & Analytics",
    description: "Generate insights from your data",
    icon: BookOpen,
    links: [
      { label: "Creating custom reports", href: "#" },
      { label: "Scheduling reports", href: "#" },
      { label: "Exporting data", href: "#" },
    ],
  },
]

const faqs = [
  {
    question: "How do I import assets from a spreadsheet?",
    answer:
      "Go to Assets > Import and upload a CSV or Excel file. We provide a template with the required columns. Our system will validate the data and show you a preview before importing.",
  },
  {
    question: "Can I give my accountant read-only access?",
    answer:
      "Yes! Go to Settings > Team and invite them with the 'Viewer' or 'Auditor' role. They'll be able to see reports and documents but won't be able to make changes.",
  },
  {
    question: "How are document expirations tracked?",
    answer:
      "When you upload a document, you can set an expiration date. The system will automatically alert you 30, 14, and 7 days before expiration. You can customize these intervals in Settings.",
  },
  {
    question: "Is my data encrypted?",
    answer:
      "Yes, all data is encrypted at rest using AES-256 and in transit using TLS 1.3. We maintain SOC 2 Type II certification and undergo regular security audits.",
  },
  {
    question: "How do I request a new feature?",
    answer:
      "Contact our support team through this help page or email feedback@lacoda.com. We review all feature requests and prioritize based on customer demand.",
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [supportSubmitted, setSupportSubmitted] = React.useState(false)
  const reducedMotion = useReducedMotion()

  const completedSteps = gettingStartedSteps.filter((s) => s.completed).length
  const progressPercentage = (completedSteps / gettingStartedSteps.length) * 100

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSupportSubmitted(true)
  }

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Help Center</h1>
        <p className="text-zinc-400 mt-1">
          Find answers, get support, and learn how to use Lacoda
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Getting Started Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Getting Started</CardTitle>
                <Badge variant="outline">
                  {completedSteps}/{gettingStartedSteps.length} complete
                </Badge>
              </div>
              <div className="mt-2 h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tiffany-500 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {gettingStartedSteps.map((step, index) => (
                <Link
                  key={step.title}
                  href={step.link}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    step.completed
                      ? "border-zinc-800 bg-zinc-800/30"
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium",
                        step.completed
                          ? "bg-tiffany-500/20 text-tiffany-500"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          step.completed ? "text-zinc-400" : "text-zinc-100"
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-zinc-500">{step.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-4">
            {quickLinks.map((section) => (
              <Card key={section.title} className="hover:border-zinc-700 transition-colors">
                <CardContent className="p-4">
                  <div className="p-2 rounded-lg bg-tiffany-500/10 w-fit mb-3">
                    <section.icon className="h-4 w-4 text-tiffany-500" />
                  </div>
                  <h3 className="font-medium text-zinc-100 text-sm">
                    {section.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 mb-3">
                    {section.description}
                  </p>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-xs text-tiffany-500 hover:text-tiffany-300 flex items-center gap-1"
                        >
                          {link.label}
                          <ChevronRight className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="p-4 rounded-lg border border-zinc-800">
                  <h4 className="font-medium text-zinc-100 text-sm">
                    {faq.question}
                  </h4>
                  <p className="mt-2 text-sm text-zinc-400">{faq.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-tiffany-500" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Get help from our support team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!supportSubmitted ? (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Question</SelectItem>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <textarea
                      rows={4}
                      placeholder="Describe your issue..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-tiffany-500 focus:outline-none focus:ring-1 focus:ring-tiffany-500 resize-none"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Send Message
                  </Button>
                </form>
              ) : (
                <div className="text-center py-4">
                  <div className="p-3 rounded-full bg-tiffany-500/10 w-fit mx-auto mb-3">
                    <CheckCircle2 className="h-6 w-6 text-tiffany-500" />
                  </div>
                  <p className="text-sm font-medium text-zinc-100">
                    Message sent!
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    We&apos;ll respond within 24 hours.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSupportSubmitted(false)}
                  >
                    Send another
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-tiffany-500" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-400">
                Your data security is our top priority.
              </p>
              <ul className="space-y-2">
                {[
                  "SOC 2 Type II certified",
                  "AES-256 encryption at rest",
                  "TLS 1.3 in transit",
                  "Role-based access control",
                  "Immutable audit logs",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-zinc-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-tiffany-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                <Link href="/security">
                  Learn More
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Other Ways to Reach Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-zinc-500" />
                <a
                  href="mailto:support@lacoda.com"
                  className="text-sm text-tiffany-500 hover:text-tiffany-300"
                >
                  support@lacoda.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">+1 (212) 555-0199</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  Mon-Fri, 9AM-6PM EST
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </animated.div>
  )
}
