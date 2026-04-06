/**
 * ============================================================================
 * FILE: app/(dashboard)/app/messages/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Advisor-facing messaging page. Displays a two-pane layout with a
 *   conversations sidebar (left) and a chat area (right).
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ MessagesPage                                                      │
 *   │   ├── useConversations()          → sidebar conversation list     │
 *   │   ├── useConversationMessages()   → chat messages for selected    │
 *   │   ├── useSendMessage()            → sends a new message           │
 *   │   └── useMarkConversationRead()   → resets unread on selection    │
 *   │         ↓                                                          │
 *   │ Server Actions (lib/actions/message.actions.ts)                    │
 *   │         ↓                                                          │
 *   │ Drizzle ORM → PostgreSQL                                           │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * DISPLAY PROPERTY DERIVATION:
 *   The DB does not store display-only fields like avatar or avatarColor.
 *   These are derived client-side:
 *     avatar      — initials from conversation name (e.g., "John Smith" → "JS")
 *     avatarColor — deterministic Tailwind class from name hash
 *
 * DATA FLOW:
 *   useConversationMessages(selectedId) re-fetches automatically when
 *   selectedId changes via a useEffect in the hook. No imperative
 *   `loadMessages()` call is needed.
 *
 * CONSUMERS:
 *   This page is rendered at /app/messages for advisors/admins.
 */
"use client"

import * as React from "react"
import { format, isToday, isYesterday } from "date-fns"
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Check,
  CheckCheck,
  File,
  Download,
  MessageSquare,
  Users,
  Clock,
  ChevronLeft,
  Plus,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { PageHeader, StatCard } from "@/components/dashboard/content-card"
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
} from "@/lib/hooks/crud/use-messages"
import type { ConversationRecord, MessageRecord } from "@/lib/hooks/crud/use-messages"

// ============================================================================
// HELPERS
// ============================================================================

/** Deterministic avatar color from name — cycles through a palette. */
const AVATAR_COLORS = [
  "bg-tiffany-500/20 text-tiffany-400",
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400",
  "bg-purple-500/20 text-purple-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-orange-500/20 text-orange-400",
]

function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatMessageDate(dateString: string) {
  const date = new Date(dateString)
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d, yyyy")
}

function formatConversationTime(dateString: string | null) {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isToday(date)) return format(date, "h:mm a")
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d")
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface ConversationItemProps {
  conversation: ConversationRecord
  isSelected: boolean
  onClick: () => void
}

function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const avatar = getAvatarInitials(conversation.name)
  const avatarColor = getAvatarColor(conversation.name)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-start gap-3 border-b border-zinc-800/40 transition-colors text-left",
        isSelected ? "bg-zinc-800/60" : "hover:bg-zinc-800/30"
      )}
    >
      <div className="relative shrink-0">
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", avatarColor)}>
          <span className="text-sm font-semibold">{avatar}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className={cn("text-sm font-medium truncate", conversation.unreadCount > 0 ? "text-zinc-100" : "text-zinc-300")}>
              {conversation.name}
            </p>
            {conversation.type === "team" && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">Team</Badge>
            )}
          </div>
          <span className="text-xs text-zinc-500 shrink-0">
            {formatConversationTime(conversation.lastMessageAt)}
          </span>
        </div>
        <p className={cn("text-sm truncate mt-1", conversation.unreadCount > 0 ? "text-zinc-300" : "text-zinc-500")}>
          {conversation.lastMessage}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <div className="h-5 min-w-[20px] rounded-full bg-tiffany-500 flex items-center justify-center px-1.5 shrink-0">
          <span className="text-xs font-semibold text-white">{conversation.unreadCount}</span>
        </div>
      )}
    </button>
  )
}

interface MessageBubbleProps {
  message: MessageRecord
  isMe: boolean
}

function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const attachments = message.metadata?.attachments

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-3",
          isMe ? "bg-tiffany-500 text-white" : "bg-zinc-800/80 text-zinc-100"
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>

        {attachments && attachments.length > 0 && (
          <div className={cn(
            "mt-3 p-3 rounded-xl flex items-center gap-3",
            isMe ? "bg-tiffany-600/50" : "bg-zinc-700/50"
          )}>
            <div className={cn("p-2 rounded-lg", isMe ? "bg-tiffany-500" : "bg-zinc-600")}>
              <File className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachments[0].name}</p>
              <p className={cn("text-xs", isMe ? "text-tiffany-200" : "text-zinc-400")}>
                {attachments[0].size}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 shrink-0", isMe ? "hover:bg-tiffany-500" : "hover:bg-zinc-600")}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className={cn(
          "flex items-center justify-end gap-1.5 mt-2",
          isMe ? "text-tiffany-200" : "text-zinc-500"
        )}>
          <span className="text-xs">{format(new Date(message.createdAt), "h:mm a")}</span>
          {isMe && (
            message.read ? (
              <CheckCheck className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

type TabId = "all" | "clients" | "team"

export default function MessagesPage() {
  const { conversations, stats } = useConversations()
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)
  const { messages } = useConversationMessages(selectedConversationId)
  const { mutate: sendMessage } = useSendMessage()
  const { mutate: markRead } = useMarkConversationRead()

  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [newMessage, setNewMessage] = React.useState("")
  const [showMobileChat, setShowMobileChat] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-select the first conversation when list arrives
  React.useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId])

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, selectedConversationId])

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === "all" || conv.type === activeTab || (activeTab === "clients" && conv.type === "client")
    return matchesSearch && matchesTab
  })

  const handleSend = () => {
    if (newMessage.trim() && selectedConversationId) {
      sendMessage({
        conversationId: selectedConversationId,
        content: newMessage.trim(),
        senderType: "advisor",
      })
      setNewMessage("")
    }
  }

  const handleSelectConversation = (conv: ConversationRecord) => {
    setSelectedConversationId(conv.id)
    setShowMobileChat(true)
    // Mark as read when selecting
    if (conv.unreadCount > 0) {
      markRead(conv.id)
    }
  }

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.createdAt)
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, MessageRecord[]>)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Communicate with clients and team members"
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Conversations"
          value={stats.total}
          icon={<MessageSquare className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Unread Messages"
          value={stats.unread}
          icon={<MessageSquare className="h-4 w-4 text-amber-400" />}
        />
        <StatCard
          label="Client Threads"
          value={stats.clientThreads}
          icon={<Users className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Team Threads"
          value={stats.teamThreads}
          icon={<Users className="h-4 w-4 text-blue-400" />}
        />
      </div>

      <div className="h-[calc(100vh-20rem)] rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="flex h-full">
          {/* Conversations Sidebar */}
          <div className={cn(
            "w-full md:w-80 border-r border-zinc-800/60 flex flex-col bg-zinc-900/50",
            showMobileChat && "hidden md:flex"
          )}>
            {/* Tabs & Search */}
            <div className="p-4 border-b border-zinc-800/60 space-y-3">
              <div className="flex gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "clients", label: "Clients" },
                  { id: "team", label: "Team" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabId)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      activeTab === tab.id
                        ? "bg-tiffany-500/10 text-tiffany-500"
                        : "text-zinc-400 hover:text-zinc-100"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700/50"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">No conversations found</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={cn(
            "flex-1 flex flex-col",
            !showMobileChat && "hidden md:flex"
          )}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/30">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8"
                      onClick={() => setShowMobileChat(false)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="relative">
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", getAvatarColor(selectedConversation.name))}>
                        <span className="text-sm font-semibold">{getAvatarInitials(selectedConversation.name)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{selectedConversation.name}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {selectedConversation.lastMessageAt
                          ? `Last active ${formatConversationTime(selectedConversation.lastMessageAt)}`
                          : "No messages yet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
                      <Video className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem>View client profile</DropdownMenuItem>
                        <DropdownMenuItem>View documents</DropdownMenuItem>
                        <DropdownMenuItem>Search in conversation</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem>Mute notifications</DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-400">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date}>
                      <div className="flex items-center justify-center mb-4">
                        <span className="px-3 py-1 rounded-full bg-zinc-800/50 text-xs text-zinc-500">
                          {date}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {dateMessages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isMe={message.senderType === "advisor"}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-zinc-800/60 bg-zinc-900/30">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-100 shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      className="flex-1 bg-zinc-800/50 border-zinc-700/50"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      size="icon"
                      className="h-9 w-9 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 text-center">
                    Messages are encrypted and stored securely
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                <p>Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
