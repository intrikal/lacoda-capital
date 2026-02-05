"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Search,
  HelpCircle,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Video,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Shield,
  CreditCard,
  BarChart3,
  Calendar,
  Settings,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const helpCategories = [
  {
    title: "Getting Started",
    icon: BookOpen,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
    articles: [
      "How to navigate your dashboard",
      "Understanding your portfolio overview",
      "Setting up account notifications",
    ],
  },
  {
    title: "Portfolio & Investments",
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    articles: [
      "How to view your holdings",
      "Understanding performance metrics",
      "Interpreting asset allocation",
    ],
  },
  {
    title: "Documents & Reports",
    icon: FileText,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    articles: [
      "Downloading your statements",
      "Accessing tax documents",
      "Requesting custom reports",
    ],
  },
  {
    title: "Account Security",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    articles: [
      "Setting up two-factor authentication",
      "Managing your password",
      "Understanding security alerts",
    ],
  },
  {
    title: "Billing & Payments",
    icon: CreditCard,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    articles: [
      "Understanding your fee structure",
      "Viewing transaction history",
      "Linking bank accounts",
    ],
  },
  {
    title: "Meetings & Calendar",
    icon: Calendar,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    articles: [
      "Scheduling advisor meetings",
      "Joining video calls",
      "Managing calendar reminders",
    ],
  },
]

const faqItems = [
  {
    question: "How do I schedule a meeting with my advisor?",
    answer: "You can schedule a meeting by visiting the Calendar page and clicking 'Schedule Meeting', or by sending a message to your advisor through the Messages page.",
  },
  {
    question: "Where can I find my tax documents?",
    answer: "All tax documents are available in the Documents section under the 'Tax' folder. You can also access them from the Reports page under 'Tax Reports'.",
  },
  {
    question: "How often is my portfolio updated?",
    answer: "Your portfolio is updated in real-time during market hours. After-hours valuations are updated at market close. Real estate and private equity valuations are updated quarterly.",
  },
  {
    question: "How do I download my statements?",
    answer: "Navigate to the Documents page, select the statement you want, and click the 'Download' button. You can also set up automatic statement delivery in Settings.",
  },
  {
    question: "What should I do if I notice suspicious activity?",
    answer: "Contact us immediately through the secure message system or call our security hotline at 1-800-555-0199. You can also report suspicious activity through Settings > Security.",
  },
]

export default function ClientHelpPage() {
  const reducedMotion = useReducedMotion()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null)

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-100">How can we help you?</h1>
        <p className="text-zinc-400 mt-2">
          Search our help center or browse categories below
        </p>

        {/* Search Bar */}
        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-6 text-lg"
          />
        </div>
      </div>

      {/* Quick Contact Options */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card className="cursor-pointer hover:border-zinc-700 transition-colors">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-tiffany-500/10 mb-2">
              <MessageSquare className="h-5 w-5 text-tiffany-500" />
            </div>
            <p className="text-sm font-medium text-zinc-100">Message Us</p>
            <p className="text-xs text-zinc-500">24hr response</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-zinc-700 transition-colors">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-blue-500/10 mb-2">
              <Phone className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-zinc-100">Call Support</p>
            <p className="text-xs text-zinc-500">Mon-Fri 9-5 ET</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-zinc-700 transition-colors">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-purple-500/10 mb-2">
              <Video className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-zinc-100">Video Call</p>
            <p className="text-xs text-zinc-500">Schedule anytime</p>
          </CardContent>
        </Card>
      </div>

      {/* Help Categories */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Browse by Topic</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {helpCategories.map((category) => {
            const Icon = category.icon
            return (
              <Card key={category.title} className="cursor-pointer hover:border-zinc-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("p-2 rounded-lg", category.bg)}>
                      <Icon className={cn("h-5 w-5", category.color)} />
                    </div>
                    <h3 className="font-medium text-zinc-100">{category.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {category.articles.map((article) => (
                      <li key={article}>
                        <a
                          href="#"
                          className="text-sm text-zinc-400 hover:text-tiffany-500 flex items-center gap-1"
                        >
                          <ChevronRight className="h-3 w-3" />
                          {article}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {faqItems.map((faq, index) => (
            <div
              key={index}
              className="border border-zinc-800 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
              >
                <span className="font-medium text-zinc-100">{faq.question}</span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-zinc-500 transition-transform",
                    expandedFaq === index && "rotate-90"
                  )}
                />
              </button>
              {expandedFaq === index && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-zinc-400">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Card */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-tiffany-500/20">
                <HelpCircle className="h-6 w-6 text-tiffany-500" />
              </div>
              <div>
                <p className="font-medium text-zinc-100">Still need help?</p>
                <p className="text-sm text-zinc-400">
                  Our support team is available Monday through Friday, 9am to 5pm ET.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </Button>
              <Button>
                <Phone className="h-4 w-4 mr-2" />
                Call 1-800-555-0199
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-zinc-700 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800">
                <FileText className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-100">User Guide</p>
                <p className="text-xs text-zinc-500">Complete platform documentation</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-zinc-500" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-zinc-700 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800">
                <Settings className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-100">Account Settings</p>
                <p className="text-xs text-zinc-500">Manage your preferences</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </CardContent>
        </Card>
      </div>
    </animated.div>
  )
}
