"use client"

import * as React from "react"
import { HelpCircle, ChevronDown, ChevronUp, MessageSquare, Book, Video, Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const FAQS = [
  {
    q: "How often is my portfolio updated?",
    a: "Market positions and valuations are updated daily at market close. Real estate and private equity valuations are updated when your advisor submits a new appraisal or valuation report.",
  },
  {
    q: "How do I download my statements?",
    a: "Navigate to the Document Vault from the sidebar. All statements are organized by date and type. Click the download icon next to any document to save a PDF copy.",
  },
  {
    q: "How do I schedule a meeting with my advisor?",
    a: "Go to the Calendar page and click 'Request Meeting'. Your advisor will confirm the time within one business day. You can also send a message directly through the Messages page.",
  },
  {
    q: "What is my risk score and how is it calculated?",
    a: "Your risk score (0–100) reflects your portfolio's exposure to market volatility. It's calculated based on asset class weights, historical volatility, and concentration. A higher score means higher risk — and typically higher return potential.",
  },
  {
    q: "How do I update my personal information?",
    a: "Go to Settings and click 'Edit' next to the field you want to update. Some changes (like legal name or date of birth) require document verification and must be processed by your advisor.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We maintain SOC2 Type II compliance and never share your data with third parties without your explicit consent.",
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-zinc-100 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-200">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />}
      </button>
      {open && (
        <p className="text-sm text-zinc-400 pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

const RESOURCES = [
  { icon: <Book className="h-5 w-5 text-tiffany-500" />, title: "Client Guide", description: "Step-by-step walkthrough of every feature", label: "View Guide" },
  { icon: <Video className="h-5 w-5 text-blue-400" />, title: "Video Tutorials", description: "Short videos on reading your portfolio reports", label: "Watch Videos" },
  { icon: <MessageSquare className="h-5 w-5 text-emerald-400" />, title: "Contact Advisor", description: "Send a message directly to Sarah Anderson", label: "Send Message", href: "/demo/client/messages" },
  { icon: <Mail className="h-5 w-5 text-purple-400" />, title: "Support Email", description: "support@lacodacapital.com", label: "Copy Email" },
]

export default function DemoClientHelpPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Help & Support</h1>
        <p className="text-zinc-400 mt-1 text-sm">Guides, FAQs, and ways to reach us</p>
      </div>

      {/* Quick resources */}
      <div className="grid sm:grid-cols-2 gap-3">
        {RESOURCES.map((r) => (
          <Card key={r.title} className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-zinc-800 shrink-0">{r.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100">{r.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{r.description}</p>
                {r.href ? (
                  <Link href={r.href} className="text-xs text-tiffany-500 hover:text-tiffany-400 mt-1.5 inline-block">{r.label} →</Link>
                ) : (
                  <span className="text-xs text-tiffany-500 mt-1.5 inline-block">{r.label} →</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-tiffany-500" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
