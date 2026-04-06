"use client"

import * as React from "react"
import { Send, Paperclip } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

const MESSAGES = [
  {
    id: "m1",
    from: "Sarah Anderson",
    role: "Wealth Advisor",
    body: "Hi John! Your Q4 statement is ready for review in the Document Vault. Overall the portfolio had a strong quarter — up 3.2% vs the benchmark at 2.8%. Let me know if you have any questions before our Jan 30th review meeting.",
    time: "Jan 15, 10:42 AM",
    mine: false,
  },
  {
    id: "m2",
    from: "You",
    role: null,
    body: "Thanks Sarah! I took a look — the NVDA position really helped. Should we consider trimming some and rebalancing toward fixed income given the macro environment?",
    time: "Jan 15, 11:14 AM",
    mine: true,
  },
  {
    id: "m3",
    from: "Sarah Anderson",
    role: "Wealth Advisor",
    body: "Great observation. I was actually going to bring that up on the 30th. Given your current risk profile and the rate environment, shifting 5–8% from growth equities into short-duration bonds could make sense. I'll prepare a few scenarios for us to review.",
    time: "Jan 15, 11:38 AM",
    mine: false,
  },
  {
    id: "m4",
    from: "You",
    role: null,
    body: "Perfect, that sounds good. Also — the Austin rental property lease is up in March. Worth factoring into the plan.",
    time: "Jan 15, 12:02 PM",
    mine: true,
  },
  {
    id: "m5",
    from: "Sarah Anderson",
    role: "Wealth Advisor",
    body: "Noted! I'll add that to the agenda. If you're considering selling or re-leasing, we should also look at the capital gains implications. See you on the 30th.",
    time: "Jan 15, 12:20 PM",
    mine: false,
  },
]

export default function DemoClientMessagesPage() {
  const [draft, setDraft] = React.useState("")

  return (
    <div className="space-y-4" style={{ height: "calc(100vh - 10rem)" }}>
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Messages</h1>
        <p className="text-zinc-400 mt-1 text-sm">Secure channel with your advisor</p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50 flex flex-col" style={{ height: "calc(100% - 5rem)" }}>
        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
          <div className="h-9 w-9 rounded-full bg-tiffany-500/20 flex items-center justify-center ring-1 ring-tiffany-500/30">
            <span className="text-sm font-semibold text-tiffany-500">SA</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Sarah Anderson</p>
            <p className="text-xs text-zinc-500">Wealth Advisor · Lacoda Capital</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-500">Online</span>
          </div>
        </div>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {MESSAGES.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.mine ? "flex-row-reverse" : "flex-row")}>
              {!msg.mine && (
                <div className="h-8 w-8 rounded-full bg-tiffany-500/20 flex items-center justify-center ring-1 ring-tiffany-500/30 shrink-0 mt-1">
                  <span className="text-xs font-semibold text-tiffany-500">SA</span>
                </div>
              )}
              <div className={cn("max-w-[75%]", msg.mine ? "items-end" : "items-start", "flex flex-col gap-1")}>
                {!msg.mine && (
                  <p className="text-[10px] text-zinc-500 px-1">{msg.from}</p>
                )}
                <div className={cn(
                  "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                  msg.mine
                    ? "bg-tiffany-500/15 text-zinc-100 border border-tiffany-500/20 rounded-tr-sm"
                    : "bg-zinc-800 text-zinc-200 border border-zinc-700/60 rounded-tl-sm"
                )}>
                  {msg.body}
                </div>
                <p className="text-[10px] text-zinc-600 px-1">{msg.time}</p>
              </div>
            </div>
          ))}
        </CardContent>

        {/* Compose */}
        <div className="border-t border-zinc-800/60 p-3">
          <DemoMutationTooltip>
            <div className="flex items-end gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-3 py-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message Sarah Anderson..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none min-h-[36px] max-h-24"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button className="p-1.5 rounded-lg bg-tiffany-500/20 text-tiffany-500 hover:bg-tiffany-500/30 transition-colors">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </DemoMutationTooltip>
        </div>
      </Card>
    </div>
  )
}
