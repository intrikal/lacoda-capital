import { mergeResolvers } from "@graphql-tools/merge"
import { clientResolvers } from "./client"
import { entityResolvers } from "./entity"
import { assetResolvers } from "./asset"
import { valuationResolvers } from "./valuation"
import { documentResolvers } from "./document"
import { documentRequestResolvers } from "./document-request"
import { taskResolvers } from "./task"
import { assignmentResolvers } from "./assignment"
import { ledgerEventResolvers } from "./ledger-event"
import { reportResolvers } from "./report"
import { complianceResolvers } from "./compliance"
import { integrationResolvers } from "./integration"
import { notificationResolvers } from "./notification"
import { orgResolvers } from "./org"

// Custom scalar resolvers for DateTime and JSON
const scalarResolvers = {
  DateTime: {
    __serialize: (value: unknown) => {
      if (value instanceof Date) return value.toISOString()
      return value
    },
    __parseValue: (value: unknown) => {
      if (typeof value === "string") return new Date(value)
      return value
    },
  },
  JSON: {
    __serialize: (value: unknown) => value,
    __parseValue: (value: unknown) => value,
  },
}

export const resolvers = mergeResolvers([
  scalarResolvers,
  clientResolvers,
  entityResolvers,
  assetResolvers,
  valuationResolvers,
  documentResolvers,
  documentRequestResolvers,
  taskResolvers,
  assignmentResolvers,
  ledgerEventResolvers,
  reportResolvers,
  complianceResolvers,
  integrationResolvers,
  notificationResolvers,
  orgResolvers,
])
