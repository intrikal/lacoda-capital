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

// ============================================================================
// DATA
// ============================================================================

const conversations = [
  {
    id: "1",
    name: "John & Emily Thompson",
    type: "client",
    avatar: "JT",
    avatarColor: "bg-tiffany-500/20 text-tiffany-500",
    lastMessage: "Thank you for the portfolio update. When can we schedule our quarterly review?",
    timestamp: "2024-01-20T14:30:00",
    unread: 2,
    online: false,
    aum: "$2.4M",
  },
  {
    id: "2",
    name: "Westbrook Family Trust",
    type: "client",
    avatar: "WF",
    avatarColor: "bg-purple-500/20 text-purple-400",
    lastMessage: "The trust documents have been reviewed. Please proceed with the transfer.",
    timestamp: "2024-01-20T11:15:00",
    unread: 0,
    online: true,
    aum: "$8.2M",
  },
  {
    id: "3",
    name: "Sarah Chen",
    type: "team",
    avatar: "SC",
    avatarColor: "bg-blue-500/20 text-blue-400",
    lastMessage: "I've finished the due diligence on the Miami property. Report attached.",
    timestamp: "2024-01-20T09:45:00",
    unread: 1,
    online: true,
  },
  {
    id: "4",
    name: "Apex Ventures Fund",
    type: "client",
    avatar: "AV",
    avatarColor: "bg-amber-500/20 text-amber-400",
    lastMessage: "Q4 distributions will be processed next week.",
    timestamp: "2024-01-19T16:20:00",
    unread: 0,
    online: false,
    aum: "$5.1M",
  },
  {
    id: "5",
    name: "Michael Ross",
    type: "team",
    avatar: "MR",
    avatarColor: "bg-emerald-500/20 text-emerald-400",
    lastMessage: "Client meeting notes from this morning attached.",
    timestamp: "2024-01-19T10:00:00",
    unread: 0,
    online: false,
  },
]

const messagesByConversation: Record<string, Array<{
  id: string
  senderId: "them" | "me"
  content: string
  timestamp: string
  status: "sent" | "delivered" | "read"
  attachment?: { name: string; size: string }
}>> = {
  "1": [
    { id: "1", senderId: "them", content: "Hi, I just received the Q4 statement. The portfolio looks great!", timestamp: "2024-01-20T10:00:00", status: "read" },
    { id: "2", senderId: "me", content: "Thank you! Yes, we had a strong quarter. The real estate allocation performed particularly well.", timestamp: "2024-01-20T10:15:00", status: "read" },
    { id: "3", senderId: "them", content: "Emily and I were discussing increasing our allocation to private equity. Is that something we can explore?", timestamp: "2024-01-20T11:00:00", status: "read" },
    { id: "4", senderId: "me", content: "Absolutely. I'll prepare an analysis of some opportunities that might fit your risk profile. I can have it ready for our next meeting.", timestamp: "2024-01-20T11:30:00", status: "read" },
    { id: "5", senderId: "me", content: "I've attached the preliminary portfolio rebalancing proposal for your review.", timestamp: "2024-01-20T13:00:00", status: "read", attachment: { name: "Thompson_Rebalancing_Proposal.pdf", size: "2.1 MB" } },
    { id: "6", senderId: "them", content: "Thank you for the portfolio update. When can we schedule our quarterly review?", timestamp: "2024-01-20T14:30:00", status: "delivered" },
  ],
  "2": [
    { id: "1", senderId: "them", content: "The trust documents have been reviewed by our attorney.", timestamp: "2024-01-20T10:00:00", status: "read" },
    { id: "2", senderId: "them", content: "The trust documents have been reviewed. Please proceed with the transfer.", timestamp: "2024-01-20T11:15:00", status: "read" },
  ],
  "3": [
    { id: "1", senderId: "them", content: "Just finished the site visit for the Miami Beach property.", timestamp: "2024-01-20T08:30:00", status: "read" },
    { id: "2", senderId: "me", content: "Great! How does it look?", timestamp: "2024-01-20T09:00:00", status: "read" },
    { id: "3", senderId: "them", content: "I've finished the due diligence on the Miami property. Report attached.", timestamp: "2024-01-20T09:45:00", status: "delivered", attachment: { name: "Miami_Due_Diligence_Report.pdf", size: "4.5 MB" } },
  ],
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMessageDate(dateString: string) {
  const date = new Date(dateString)
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d, yyyy")
}

function formatConversationTime(dateString: string) {
  const date = new Date(dateString)
  if (isToday(date)) return format(date, "h:mm a")
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d")
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface ConversationItemProps {
  conversation: typeof conversations[0]
  isSelected: boolean
  onClick: () => void
}

function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-start gap-3 border-b border-zinc-800/40 transition-colors text-left",
        isSelected ? "bg-zinc-800/60" : "hover:bg-zinc-800/30"
      )}
    >
      <div className="relative shrink-0">
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", conversation.avatarColor)}>
          <span className="text-sm font-semibold">{conversation.avatar}</span>
        </div>
        {conversation.online && (
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-zinc-900" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className={cn("text-sm font-medium truncate", conversation.unread > 0 ? "text-zinc-100" : "text-zinc-300")}>
              {conversation.name}
            </p>
            {conversation.type === "team" && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">Team</Badge>
            )}
          </div>
          <span className="text-xs text-zinc-500 shrink-0">
            {formatConversationTime(conversation.timestamp)}
          </span>
        </div>
        {conversation.aum && (
          <p className="text-xs text-tiffany-500 mt-0.5">{conversation.aum} AUM</p>
        )}
        <p className={cn("text-sm truncate mt-1", conversation.unread > 0 ? "text-zinc-300" : "text-zinc-500")}>
          {conversation.lastMessage}
        </p>
      </div>
      {conversation.unread > 0 && (
        <div className="h-5 min-w-[20px] rounded-full bg-tiffany-500 flex items-center justify-center px-1.5 shrink-0">
          <span className="text-xs font-semibold text-white">{conversation.unread}</span>
        </div>
      )}
    </button>
  )
}

interface MessageBubbleProps {
  message: typeof messagesByConversation["1"][0]
  isMe: boolean
}

function MessageBubble({ message, isMe }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-3",
          isMe ? "bg-tiffany-500 text-white" : "bg-zinc-800/80 text-zinc-100"
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>

        {message.attachment && (
          <div className={cn(
            "mt-3 p-3 rounded-xl flex items-center gap-3",
            isMe ? "bg-tiffany-600/50" : "bg-zinc-700/50"
          )}>
            <div className={cn("p-2 rounded-lg", isMe ? "bg-tiffany-500" : "bg-zinc-600")}>
              <File className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.attachment.name}</p>
              <p className={cn("text-xs", isMe ? "text-tiffany-200" : "text-zinc-400")}>
                {message.attachment.size}
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
          <span className="text-xs">{format(new Date(message.timestamp), "h:mm a")}</span>
          {isMe && (
            message.status === "read" ? (
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
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [selectedConversation, setSelectedConversation] = React.useState(conversations[0])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [newMessage, setNewMessage] = React.useState("")
  const [showMobileChat, setShowMobileChat] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const messages = messagesByConversation[selectedConversation.id] || []

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, selectedConversation])

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === "all" || conv.type === activeTab || (activeTab === "clients" && conv.type === "client")
    return matchesSearch && matchesTab
  })

  const handleSend = () => {
    if (newMessage.trim()) {
      setNewMessage("")
    }
  }

  const handleSelectConversation = (conv: typeof conversations[0]) => {
    setSelectedConversation(conv)
    setShowMobileChat(true)
  }

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.timestamp)
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, typeof messages>)

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread, 0)
  const clientCount = conversations.filter(c => c.type === "client").length
  const teamCount = conversations.filter(c => c.type === "team").length

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
          value={conversations.length}
          icon={<MessageSquare className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Unread Messages"
          value={unreadCount}
          icon={<MessageSquare className="h-4 w-4 text-amber-400" />}
        />
        <StatCard
          label="Client Threads"
          value={clientCount}
          icon={<Users className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Team Threads"
          value={teamCount}
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
                    isSelected={selectedConversation.id === conversation.id}
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
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", selectedConversation.avatarColor)}>
                    <span className="text-sm font-semibold">{selectedConversation.avatar}</span>
                  </div>
                  {selectedConversation.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-zinc-900" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{selectedConversation.name}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    {selectedConversation.online ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Online
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        Last seen recently
                      </>
                    )}
                    {selectedConversation.aum && (
                      <>
                        <span className="mx-1">·</span>
                        <span className="text-tiffany-500">{selectedConversation.aum}</span>
                      </>
                    )}
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
                        isMe={message.senderId === "me"}
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
          </div>
        </div>
      </div>
    </div>
  )
}
