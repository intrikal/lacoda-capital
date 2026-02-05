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
  Image as ImageIcon,
  File,
  Download,
  X,
  MessageSquare,
  Users,
  Clock,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ============================================================================
// DATA
// ============================================================================

const conversations = [
  {
    id: "1",
    name: "Sarah Anderson",
    role: "Wealth Advisor",
    avatar: "SA",
    avatarColor: "bg-tiffany-500/20 text-tiffany-500",
    lastMessage: "I've prepared the Q4 report for your review. Let me know when you'd like to discuss.",
    timestamp: "2024-01-20T14:30:00",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Michael Chen",
    role: "Tax Specialist",
    avatar: "MC",
    avatarColor: "bg-purple-500/20 text-purple-400",
    lastMessage: "Your tax documents are ready for review.",
    timestamp: "2024-01-19T11:15:00",
    unread: 0,
    online: false,
  },
  {
    id: "3",
    name: "Lacoda Capital Support",
    role: "Support Team",
    avatar: "LC",
    avatarColor: "bg-blue-500/20 text-blue-400",
    lastMessage: "Welcome to Lacoda Capital! We're here to help.",
    timestamp: "2024-01-15T09:00:00",
    unread: 0,
    online: true,
  },
]

const messagesByConversation: Record<string, Array<{
  id: string
  senderId: "advisor" | "client"
  content: string
  timestamp: string
  status: "sent" | "delivered" | "read"
  attachment?: { name: string; size: string; type: "pdf" | "image" }
}>> = {
  "1": [
    {
      id: "1",
      senderId: "advisor",
      content: "Good morning! I wanted to follow up on our discussion about your portfolio allocation.",
      timestamp: "2024-01-20T09:00:00",
      status: "read",
    },
    {
      id: "2",
      senderId: "client",
      content: "Good morning Sarah! Yes, I've been thinking about it. What do you recommend?",
      timestamp: "2024-01-20T09:15:00",
      status: "read",
    },
    {
      id: "3",
      senderId: "advisor",
      content: "Based on your goals and risk tolerance, I suggest we increase your real estate allocation by 5% and reduce fixed income accordingly. This would give you better growth potential while maintaining stability.",
      timestamp: "2024-01-20T09:20:00",
      status: "read",
    },
    {
      id: "4",
      senderId: "client",
      content: "That sounds reasonable. Can you send me the analysis?",
      timestamp: "2024-01-20T10:00:00",
      status: "read",
    },
    {
      id: "5",
      senderId: "advisor",
      content: "Of course! I've attached the detailed analysis report. Take your time reviewing it, and we can schedule a call to discuss any questions.",
      timestamp: "2024-01-20T10:15:00",
      status: "read",
      attachment: {
        name: "Portfolio_Reallocation_Analysis.pdf",
        size: "2.4 MB",
        type: "pdf",
      },
    },
    {
      id: "6",
      senderId: "advisor",
      content: "I've prepared the Q4 report for your review. Let me know when you'd like to discuss.",
      timestamp: "2024-01-20T14:30:00",
      status: "delivered",
    },
  ],
  "2": [
    {
      id: "1",
      senderId: "advisor",
      content: "Hi, I've finished preparing your 2023 tax documents. They're ready for your review.",
      timestamp: "2024-01-19T10:00:00",
      status: "read",
    },
    {
      id: "2",
      senderId: "advisor",
      content: "Your tax documents are ready for review.",
      timestamp: "2024-01-19T11:15:00",
      status: "read",
    },
  ],
  "3": [
    {
      id: "1",
      senderId: "advisor",
      content: "Welcome to Lacoda Capital! We're here to help you manage your wealth effectively. Feel free to reach out anytime.",
      timestamp: "2024-01-15T09:00:00",
      status: "read",
    },
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
          <p className={cn("text-sm font-medium truncate", conversation.unread > 0 ? "text-zinc-100" : "text-zinc-300")}>
            {conversation.name}
          </p>
          <span className="text-xs text-zinc-500 shrink-0">
            {formatConversationTime(conversation.timestamp)}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{conversation.role}</p>
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
  isClient: boolean
}

function MessageBubble({ message, isClient }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isClient ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-3",
          isClient
            ? "bg-tiffany-500 text-white"
            : "bg-zinc-800/80 text-zinc-100"
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>

        {message.attachment && (
          <div className={cn(
            "mt-3 p-3 rounded-xl flex items-center gap-3",
            isClient ? "bg-tiffany-600/50" : "bg-zinc-700/50"
          )}>
            <div className={cn(
              "p-2 rounded-lg",
              isClient ? "bg-tiffany-500" : "bg-zinc-600"
            )}>
              {message.attachment.type === "pdf" ? (
                <File className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.attachment.name}</p>
              <p className={cn("text-xs", isClient ? "text-tiffany-200" : "text-zinc-400")}>
                {message.attachment.size}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 shrink-0", isClient ? "hover:bg-tiffany-500" : "hover:bg-zinc-600")}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className={cn(
          "flex items-center justify-end gap-1.5 mt-2",
          isClient ? "text-tiffany-200" : "text-zinc-500"
        )}>
          <span className="text-xs">{format(new Date(message.timestamp), "h:mm a")}</span>
          {isClient && (
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

export default function ClientMessagesPage() {
  const [selectedConversation, setSelectedConversation] = React.useState(conversations[0])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [newMessage, setNewMessage] = React.useState("")
  const [showMobileChat, setShowMobileChat] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const messages = messagesByConversation[selectedConversation.id] || []

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, selectedConversation])

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSend = () => {
    if (newMessage.trim()) {
      setNewMessage("")
    }
  }

  const handleSelectConversation = (conv: typeof conversations[0]) => {
    setSelectedConversation(conv)
    setShowMobileChat(true)
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.timestamp)
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, typeof messages>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Messages</h1>
          <p className="mt-1 text-sm text-zinc-400">Communicate with your advisory team</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{conversations.length} conversations</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>{conversations.reduce((sum, c) => sum + c.unread, 0)} unread</span>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="h-[calc(100vh-14rem)] rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="flex h-full">
          {/* Conversations Sidebar */}
          <div className={cn(
            "w-full md:w-80 border-r border-zinc-800/60 flex flex-col bg-zinc-900/50",
            showMobileChat && "hidden md:flex"
          )}>
            {/* Search */}
            <div className="p-4 border-b border-zinc-800/60">
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
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
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
                    <DropdownMenuItem>View profile</DropdownMenuItem>
                    <DropdownMenuItem>Search in conversation</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem>Mute notifications</DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-400">Clear chat</DropdownMenuItem>
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
                        isClient={message.senderId === "client"}
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
                End-to-end encrypted • Your advisor typically responds within 24 hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
