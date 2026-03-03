import type { CodegenConfig } from "@graphql-codegen/cli"

const config: CodegenConfig = {
  schema: "lib/graphql/schema/**/*.graphql",
  documents: "lib/graphql/operations/**/*.ts",
  generates: {
    "lib/graphql/generated/types.ts": {
      plugins: [
        "typescript",
        "typescript-resolvers",
        "typescript-operations",
      ],
      config: {
        useIndexSignature: true,
        contextType: "../resolvers/context#GraphQLContext",
        scalars: {
          DateTime: "string",
          JSON: "Record<string, unknown>",
        },
        mappers: {
          Org: "../../app/db/schema/orgs#Org",
          User: "../../app/db/schema/users#User",
          OrgMember: "../../app/db/schema/org_members#OrgMember",
          Client: "../../app/db/schema/clients#Client",
          Entity: "../../app/db/schema/entities#Entity",
          Asset: "../../app/db/schema/assets#Asset",
          Valuation: "../../app/db/schema/valuations#Valuation",
          Document: "../../app/db/schema/documents#Document",
          DocumentRequest: "../../app/db/schema/document_requests#DocumentRequest",
          Task: "../../app/db/schema/tasks#Task",
          Assignment: "../../app/db/schema/assignments#Assignment",
          LedgerEvent: "../../app/db/schema/ledger_events#LedgerEvent",
          Report: "../../app/db/schema/reports#Report",
          ReportVersion: "../../app/db/schema/reports#ReportVersion",
          ComplianceControl: "../../app/db/schema/compliance#ComplianceControl",
          ComplianceEvidence: "../../app/db/schema/compliance#ComplianceEvidence",
          Integration: "../../app/db/schema/integrations#Integration",
          Notification: "../../app/db/schema/notifications#Notification",
        },
      },
    },
  },
  ignoreNoDocuments: true,
}

export default config
