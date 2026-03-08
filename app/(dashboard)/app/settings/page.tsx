/**
 * ============================================================================
 * FILE: app/(dashboard)/app/settings/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Advisor-facing settings page with tabs for Profile, Team, Security,
 *   and Notifications preferences.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ SettingsPage                                                      │
 *   │   ├── useCurrentMember()          → current user's org membership │
 *   │   ├── useOrgMembers()             → fetches team member list      │
 *   │   ├── useInviteOrgMember()        → invites by email              │
 *   │   ├── useUpdateOrgMemberRole()    → changes a member's role       │
 *   │   ├── useRemoveOrgMember()        → removes a member              │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ orgResolvers → Drizzle ORM → PostgreSQL                           │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   This page is rendered at /app/settings for advisors/admins.
 */
"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  User,
  Users,
  Shield,
  Bell,
  Key,
  Smartphone,
  Plus,
  MoreHorizontal,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useOrgMembers,
  useCurrentMember,
  useInviteOrgMember,
  useUpdateOrgMemberRole,
  useRemoveOrgMember,
} from "@/lib/hooks/crud/use-org-members"
import type { OrgMemberRole, OrgMemberRecord } from "@/lib/hooks/crud/use-org-members"

// ─── ROLE DISPLAY CONFIG ─────────────────────────────────────────────────────

const roleLabels: Record<OrgMemberRole, string> = {
  admin: "Admin",
  assistant: "Assistant",
  client: "Client",
}

const roleBadgeVariants: Record<OrgMemberRole, "primary" | "secondary" | "default"> = {
  admin: "primary",
  assistant: "secondary",
  client: "default",
}

// ─── INVITE DIALOG ───────────────────────────────────────────────────────────

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (email: string, role: OrgMemberRole) => void
  isPending: boolean
}

function InviteDialog({ open, onOpenChange, onSubmit, isPending }: InviteDialogProps) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<OrgMemberRole>("assistant")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    onSubmit(email.trim(), role)
    setEmail("")
    setRole("assistant")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgMemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Inviting..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── MEMBER ROW ──────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: OrgMemberRecord
  isCurrentUser: boolean
  onUpdateRole: (id: string, role: OrgMemberRole) => void
  onRemove: (id: string) => void
}

function MemberRow({ member, isCurrentUser, onUpdateRole, onRemove }: MemberRowProps) {
  const displayName = member.user.fullName || member.user.email

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
      <div className="flex items-center gap-3">
        <Avatar fallback={displayName} />
        <div>
          <p className="font-medium text-zinc-100">
            {displayName}
            {isCurrentUser && (
              <span className="text-xs text-zinc-500 ml-2">(you)</span>
            )}
          </p>
          <p className="text-sm text-zinc-500">{member.user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={roleBadgeVariants[member.role]}>
          {roleLabels[member.role]}
        </Badge>
        {!isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["admin", "assistant", "client"] as OrgMemberRole[])
                .filter((r) => r !== member.role)
                .map((r) => (
                  <DropdownMenuItem key={r} onClick={() => onUpdateRole(member.id, r)}>
                    Change to {roleLabels[r]}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                className="text-red-400"
                onClick={() => onRemove(member.id)}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

// ─── PAGE COMPONENT ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const reducedMotion = useReducedMotion()
  const { member: currentMember } = useCurrentMember()
  const { members } = useOrgMembers()
  const { mutate: inviteMember, isPending: invitePending } = useInviteOrgMember()
  const { mutate: updateRole } = useUpdateOrgMemberRole()
  const { mutate: removeMember } = useRemoveOrgMember()

  const [inviteOpen, setInviteOpen] = React.useState(false)

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const handleInvite = async (email: string, role: OrgMemberRole) => {
    await inviteMember({ email, role })
    setInviteOpen(false)
  }

  const handleUpdateRole = (id: string, role: OrgMemberRole) => {
    updateRole(id, { role })
  }

  const handleRemove = (id: string) => {
    removeMember(id)
  }

  const displayName = currentMember?.user?.fullName || ""
  const [firstName = "", lastName = ""] = displayName.split(" ")

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 mt-1">
          Manage your account and organization settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar fallback={displayName || "User"} size="lg" />
                <div>
                  <Button variant="outline" size="sm">
                    Change Photo
                  </Button>
                  <p className="text-xs text-zinc-500 mt-1">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue={firstName} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue={lastName} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={currentMember?.user?.email ?? ""} type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={currentMember ? roleLabels[currentMember.role] : ""}
                    disabled
                    className="bg-zinc-800"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>
                Customize your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">Timezone</p>
                  <p className="text-sm text-zinc-500">
                    Used for displaying dates and times
                  </p>
                </div>
                <Select defaultValue="america_new_york">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america_new_york">
                      Eastern Time (ET)
                    </SelectItem>
                    <SelectItem value="america_los_angeles">
                      Pacific Time (PT)
                    </SelectItem>
                    <SelectItem value="europe_london">
                      London (GMT)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">Currency Display</p>
                  <p className="text-sm text-zinc-500">
                    Primary currency for valuations
                  </p>
                </div>
                <Select defaultValue="usd">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (&euro;)</SelectItem>
                    <SelectItem value="gbp">GBP (&pound;)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>
                  Manage your organization&apos;s team and permissions.
                </CardDescription>
              </div>
              {currentMember?.role === "admin" && (
                <Button onClick={() => setInviteOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isCurrentUser={member.id === currentMember?.id}
                    onUpdateRole={handleUpdateRole}
                    onRemove={handleRemove}
                  />
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-8">
                    No team members found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Multi-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Smartphone className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">
                      Authenticator App
                    </p>
                    <p className="text-sm text-zinc-500">
                      Use an authenticator app like Google Authenticator
                    </p>
                  </div>
                </div>
                <Badge variant="success">Enabled</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password</CardTitle>
              <CardDescription>
                Change your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" />
              </div>
              <div className="flex justify-end">
                <Button>Update Password</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800">
                      <Key className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">
                        Chrome on macOS
                      </p>
                      <p className="text-sm text-zinc-500">
                        New York, NY &middot; Current session
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Notifications</CardTitle>
              <CardDescription>
                Choose what updates you receive by email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: "Document Alerts",
                  description: "Get notified about expiring or missing documents",
                  enabled: true,
                },
                {
                  title: "Valuation Updates",
                  description: "Receive updates when asset valuations change",
                  enabled: true,
                },
                {
                  title: "Team Activity",
                  description: "Be informed about team member actions",
                  enabled: false,
                },
                {
                  title: "Weekly Summary",
                  description: "Receive a weekly digest of portfolio activity",
                  enabled: true,
                },
              ].map((notification) => (
                <div
                  key={notification.title}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-100">
                      {notification.title}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {notification.description}
                    </p>
                  </div>
                  <Button
                    variant={notification.enabled ? "default" : "outline"}
                    size="sm"
                  >
                    {notification.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
        isPending={invitePending}
      />
    </animated.div>
  )
}
