import { mergeResolvers } from "@graphql-tools/merge"
import { clientResolvers } from "./client"
import { entityResolvers } from "./entity"
import { assetResolvers } from "./asset"
import { valuationResolvers } from "./valuation"
import { documentResolvers } from "./document"
import { documentRequestResolvers } from "./document-request"
import { taskResolvers } from "./task"
import { goalResolvers } from "./goal"
import { messageResolvers } from "./message"
import { assignmentResolvers } from "./assignment"
import { ledgerEventResolvers } from "./ledger-event"
import { reportResolvers } from "./report"
import { complianceResolvers } from "./compliance"
import { integrationResolvers } from "./integration"
import { notificationResolvers } from "./notification"
import { calendarEventResolvers } from "./calendar-event"
import { dealResolvers } from "./deal"
import { insurancePolicyResolvers } from "./insurance-policy"
import { benchmarkResolvers } from "./benchmark"
import { billingRecordResolvers } from "./billing-record"
import { taxDeductionResolvers } from "./tax-deduction"
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
  goalResolvers,
  messageResolvers,
  assignmentResolvers,
  ledgerEventResolvers,
  reportResolvers,
  complianceResolvers,
  integrationResolvers,
  notificationResolvers,
  calendarEventResolvers,
  dealResolvers,
  insurancePolicyResolvers,
  benchmarkResolvers,
  billingRecordResolvers,
  taxDeductionResolvers,
  orgResolvers,
])
