"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  User,
  Building2,
  Heart,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Mock beneficiaries
const beneficiaries = [
  {
    id: "1",
    name: "Sarah Doe",
    relationship: "Spouse",
    type: "primary",
    percentage: 50,
    accounts: ["Brokerage Account", "Retirement IRA"],
    ssn: "***-**-1234",
    dateOfBirth: "1985-03-15",
    address: "123 Main St, New York, NY 10001",
    phone: "+1 (555) 123-4567",
    email: "sarah.doe@example.com",
    verified: true,
  },
  {
    id: "2",
    name: "Michael Doe",
    relationship: "Child",
    type: "primary",
    percentage: 25,
    accounts: ["Brokerage Account"],
    ssn: "***-**-5678",
    dateOfBirth: "2010-08-22",
    address: "123 Main St, New York, NY 10001",
    phone: null,
    email: null,
    verified: true,
  },
  {
    id: "3",
    name: "Emily Doe",
    relationship: "Child",
    type: "primary",
    percentage: 25,
    accounts: ["Brokerage Account"],
    ssn: "***-**-9012",
    dateOfBirth: "2013-11-30",
    address: "123 Main St, New York, NY 10001",
    phone: null,
    email: null,
    verified: true,
  },
  {
    id: "4",
    name: "Robert Doe",
    relationship: "Sibling",
    type: "contingent",
    percentage: 100,
    accounts: ["Brokerage Account", "Retirement IRA"],
    ssn: "***-**-3456",
    dateOfBirth: "1982-06-10",
    address: "456 Oak Ave, Boston, MA 02101",
    phone: "+1 (555) 987-6543",
    email: "robert.doe@example.com",
    verified: false,
  },
]

// Investment accounts
const accounts = [
  { id: "1", name: "Brokerage Account", totalPercentage: 100, hasBeneficiaries: true },
  { id: "2", name: "Retirement IRA", totalPercentage: 100, hasBeneficiaries: true },
  { id: "3", name: "Roth IRA", totalPercentage: 0, hasBeneficiaries: false },
]

const relationshipOptions = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Grandchild",
  "Other Family",
  "Trust",
  "Charity",
  "Estate",
  "Other",
]

function AddBeneficiaryDialog() {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Beneficiary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Beneficiary</DialogTitle>
          <DialogDescription>
            Add a new beneficiary to your accounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="First name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Last name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {relationshipOptions.map((rel) => (
                    <SelectItem key={rel} value={rel.toLowerCase()}>
                      {rel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="contingent">Contingent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ssn">Social Security Number</Label>
            <Input id="ssn" placeholder="XXX-XX-XXXX" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Percentage Share</Label>
            <div className="relative">
              <Input id="percentage" type="number" min="0" max="100" placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accounts</Label>
            <div className="space-y-2">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                >
                  <input type="checkbox" className="rounded border-zinc-700" />
                  <span className="text-sm text-zinc-100">{account.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>
            Add Beneficiary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BeneficiaryCard({ beneficiary }: { beneficiary: typeof beneficiaries[0] }) {
  const isPrimary = beneficiary.type === "primary"

  return (
    <Card className={cn(!beneficiary.verified && "border-amber-500/50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-full",
              isPrimary ? "bg-tiffany-500/10" : "bg-zinc-700"
            )}>
              <User className={cn("h-5 w-5", isPrimary ? "text-tiffany-500" : "text-zinc-400")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-zinc-100">{beneficiary.name}</h3>
                {beneficiary.verified ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <p className="text-sm text-zinc-400">{beneficiary.relationship}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isPrimary ? "default" : "secondary"}>
                  {isPrimary ? "Primary" : "Contingent"}
                </Badge>
                <Badge variant="outline" className="text-tiffany-500">
                  {beneficiary.percentage}%
                </Badge>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                <p>SSN: {beneficiary.ssn}</p>
                <p>DOB: {new Date(beneficiary.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <p className="mt-1">Accounts: {beneficiary.accounts.join(", ")}</p>
              </div>
              {!beneficiary.verified && (
                <div className="mt-3 flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Verification required</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon">
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-rose-400 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Beneficiary</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {beneficiary.name} as a beneficiary?
                    This action cannot be undone.
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
      </CardContent>
    </Card>
  )
}

export default function ClientBeneficiariesPage() {
  const reducedMotion = useReducedMotion()

  const primaryBeneficiaries = beneficiaries.filter((b) => b.type === "primary")
  const contingentBeneficiaries = beneficiaries.filter((b) => b.type === "contingent")
  const unverifiedCount = beneficiaries.filter((b) => !b.verified).length

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Beneficiaries</h1>
          <p className="text-zinc-400 mt-1">
            Manage beneficiaries for your investment accounts
          </p>
        </div>
        <AddBeneficiaryDialog />
      </div>

      {/* Alert if unverified */}
      {unverifiedCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div>
                <p className="font-medium text-zinc-100">
                  {unverifiedCount} beneficiary {unverifiedCount === 1 ? "requires" : "require"} verification
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Please review and verify beneficiary information to ensure accuracy.
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  account.hasBeneficiaries ? "bg-tiffany-500/10" : "bg-amber-400/10"
                )}>
                  <Building2 className={cn(
                    "h-5 w-5",
                    account.hasBeneficiaries ? "text-tiffany-500" : "text-amber-400"
                  )} />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">{account.name}</p>
                  <p className="text-sm text-zinc-500">
                    {account.hasBeneficiaries
                      ? `${account.totalPercentage}% allocated`
                      : "No beneficiaries assigned"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Primary Beneficiaries */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-tiffany-500" />
          <h2 className="text-lg font-semibold text-zinc-100">Primary Beneficiaries</h2>
          <Badge variant="secondary">{primaryBeneficiaries.length}</Badge>
        </div>
        <div className="grid gap-4">
          {primaryBeneficiaries.map((beneficiary) => (
            <BeneficiaryCard key={beneficiary.id} beneficiary={beneficiary} />
          ))}
        </div>
      </div>

      {/* Contingent Beneficiaries */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Contingent Beneficiaries</h2>
          <Badge variant="secondary">{contingentBeneficiaries.length}</Badge>
        </div>
        {contingentBeneficiaries.length > 0 ? (
          <div className="grid gap-4">
            {contingentBeneficiaries.map((beneficiary) => (
              <BeneficiaryCard key={beneficiary.id} beneficiary={beneficiary} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No contingent beneficiaries assigned</p>
              <p className="text-sm text-zinc-500 mt-1">
                Contingent beneficiaries receive assets if primary beneficiaries are unavailable
              </p>
              <Button variant="outline" className="mt-4">
                Add Contingent Beneficiary
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-zinc-100">Important Information</p>
              <ul className="text-sm text-zinc-400 mt-2 space-y-1 list-disc list-inside">
                <li>Primary beneficiary percentages should total 100% for each account</li>
                <li>Contingent beneficiaries receive assets only if no primary beneficiaries survive</li>
                <li>Changes to beneficiaries may require notarization for certain accounts</li>
                <li>Contact your advisor for help with complex beneficiary designations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
