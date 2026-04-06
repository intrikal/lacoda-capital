import { desc } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth"
import { db } from "@/app/db"
import { contactSubmissions } from "@/app/db/schema"

export default async function LeadsPage() {
  await requireAdmin()

  const leads = await db
    .select()
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Contact form submissions from the marketing site.
        </p>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Subject / Reason</th>
              <th className="px-4 py-3 text-left font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No submissions yet.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-muted">
                      {lead.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lead.subject ?? lead.reason ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {lead.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
