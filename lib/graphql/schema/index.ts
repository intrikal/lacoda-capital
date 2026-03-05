import { readFileSync } from "fs"
import { join } from "path"
import { mergeTypeDefs } from "@graphql-tools/merge"

const schemaDir = join(process.cwd(), "lib/graphql/schema")

const schemaFiles = [
  "schema.graphql",
  "client.graphql",
  "entity.graphql",
  "asset.graphql",
  "valuation.graphql",
  "org.graphql",
  "user.graphql",
  "org-member.graphql",
  "document.graphql",
  "document-request.graphql",
  "task.graphql",
  "goal.graphql",
  "message.graphql",
  "assignment.graphql",
  "ledger-event.graphql",
  "report.graphql",
  "compliance.graphql",
  "integration.graphql",
  "notification.graphql",
  "calendar-event.graphql",
  "deal.graphql",
  "insurance-policy.graphql",
  "benchmark.graphql",
]

const typeDefsArray = schemaFiles.map((file) =>
  readFileSync(join(schemaDir, file), "utf-8")
)

export const typeDefs = mergeTypeDefs(typeDefsArray)
