"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  User,
  Bell,
  Shield,
  Eye,
  Smartphone,
  Mail,
  Key,
  CreditCard,
  Globe,
  Moon,
  Sun,
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

// Mock trusted contacts
const trustedContacts = [
  {
    id: "1",
    name: "Robert Doe",
    relationship: "Sibling",
    phone: "+1 (555) 987-6543",
    email: "robert.doe@example.com",
    canReceiveInfo: true,
    canMakeDecisions: false,
    verified: true,
  },
  {
    id: "2",
    name: "Lisa Johnson",
    relationship: "Attorney",
    phone: "+1 (555) 456-7890",
    email: "ljohnson@lawfirm.com",
    canReceiveInfo: true,
    canMakeDecisions: true,
    verified: true,
  },
]
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

export default function ClientSettingsPage() {
  const reducedMotion = useReducedMotion()
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [pushNotifications, setPushNotifications] = React.useState(true)
  const [marketingEmails, setMarketingEmails] = React.useState(false)
  const [twoFactor, setTwoFactor] = React.useState(true)
  const [biometric, setBiometric] = React.useState(false)

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 mt-1">
          Manage your account preferences and security
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="trusted">
            <Users className="h-4 w-4 mr-2" />
            Trusted Contacts
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Eye className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-full bg-tiffany-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-tiffany-500">JD</span>
                </div>
                <div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                  <p className="text-xs text-zinc-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="john.doe@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Mailing Address</Label>
                <Input id="address" defaultValue="123 Main St, New York, NY 10001" />
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Accounts</CardTitle>
              <CardDescription>Manage connected bank accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <CreditCard className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">Chase Bank ****4532</p>
                      <p className="text-xs text-zinc-500">Primary checking account</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Manage</Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CreditCard className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">Bank of America ****7891</p>
                      <p className="text-xs text-zinc-500">Savings account</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Manage</Button>
                </div>
              </div>
              <Button variant="outline" className="mt-4">
                <CreditCard className="h-4 w-4 mr-2" />
                Link New Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trusted Contacts Tab */}
        <TabsContent value="trusted" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Trusted Contacts</CardTitle>
                  <CardDescription>
                    People who can be contacted on your behalf in case of emergency
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Trusted Contact</DialogTitle>
                      <DialogDescription>
                        Add someone who can be contacted about your account
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactFirstName">First Name</Label>
                          <Input id="contactFirstName" placeholder="First name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactLastName">Last Name</Label>
                          <Input id="contactLastName" placeholder="Last name" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactRelationship">Relationship</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="attorney">Attorney</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Phone Number</Label>
                        <Input id="contactPhone" placeholder="+1 (555) 000-0000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email Address</Label>
                        <Input id="contactEmail" type="email" placeholder="email@example.com" />
                      </div>
                      <div className="space-y-3 pt-2">
                        <Label>Permissions</Label>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800">
                          <div>
                            <p className="text-sm font-medium text-zinc-100">Receive account information</p>
                            <p className="text-xs text-zinc-500">Can receive basic account status updates</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800">
                          <div>
                            <p className="text-sm font-medium text-zinc-100">Make decisions on your behalf</p>
                            <p className="text-xs text-zinc-500">Can authorize transactions if you're incapacitated</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Add Contact</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {trustedContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No trusted contacts added yet</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Add trusted contacts who can be reached in case of emergency
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trustedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-start justify-between p-4 rounded-lg border border-zinc-800"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-tiffany-500/10">
                          <User className="h-5 w-5 text-tiffany-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-zinc-100">{contact.name}</p>
                            {contact.verified && (
                              <Badge variant="outline" className="text-xs text-emerald-400">
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-400">{contact.relationship}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {contact.canReceiveInfo && (
                              <Badge variant="secondary" className="text-xs">Can receive info</Badge>
                            )}
                            {contact.canMakeDecisions && (
                              <Badge variant="secondary" className="text-xs">Can make decisions</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-rose-400">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Trusted Contact</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {contact.name} as a trusted contact?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-rose-500 hover:bg-rose-600">
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-100">Why add trusted contacts?</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Trusted contacts help protect you in case of emergency, suspected exploitation,
                    or cognitive decline. They cannot access your account directly but can be contacted
                    by your advisor if concerns arise about your wellbeing.
                  </p>
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
              <CardDescription>Choose what updates you receive by email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Account Updates</p>
                    <p className="text-xs text-zinc-500">Receive updates about your account activity</p>
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Weekly Reports</p>
                    <p className="text-xs text-zinc-500">Receive weekly portfolio summaries</p>
                  </div>
                </div>
                <Switch checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Marketing Emails</p>
                    <p className="text-xs text-zinc-500">Receive news and promotional content</p>
                  </div>
                </div>
                <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription>Manage mobile and browser notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Push Notifications</p>
                    <p className="text-xs text-zinc-500">Receive push notifications on your devices</p>
                  </div>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Transaction Alerts</p>
                    <p className="text-xs text-zinc-500">Get notified about important transactions</p>
                  </div>
                </div>
                <Switch checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Meeting Reminders</p>
                    <p className="text-xs text-zinc-500">Receive reminders for upcoming meetings</p>
                  </div>
                </div>
                <Switch checked={true} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password</CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Two-Factor Authentication</p>
                    <p className="text-xs text-zinc-500">Require a code in addition to your password</p>
                  </div>
                </div>
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Biometric Login</p>
                    <p className="text-xs text-zinc-500">Use fingerprint or face recognition</p>
                  </div>
                </div>
                <Switch checked={biometric} onCheckedChange={setBiometric} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Sessions</CardTitle>
              <CardDescription>Manage your active login sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Globe className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">Chrome on Windows</p>
                      <p className="text-xs text-zinc-500">New York, NY • Current session</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-700">
                      <Smartphone className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">iPhone 15 Pro</p>
                      <p className="text-xs text-zinc-500">New York, NY • Last active 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-rose-400">Revoke</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Display Preferences</CardTitle>
              <CardDescription>Customize your viewing experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="flex-1 justify-start">
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </Button>
                  <Button variant="ghost" className="flex-1 justify-start">
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Currency Display</Label>
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                    <SelectItem value="gbp">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select defaultValue="mdy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time Zone</Label>
                <Select defaultValue="est">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="est">Eastern Time (ET)</SelectItem>
                    <SelectItem value="cst">Central Time (CT)</SelectItem>
                    <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                    <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Privacy Settings</CardTitle>
              <CardDescription>Control your data and privacy preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Hide Portfolio Balances</p>
                  <p className="text-xs text-zinc-500">Show balances as ••••• on dashboard</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Analytics & Cookies</p>
                  <p className="text-xs text-zinc-500">Help improve our services with usage data</p>
                </div>
                <Switch checked={true} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </animated.div>
  )
}
