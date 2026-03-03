"use client"

import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client"
import { ApolloProvider } from "@apollo/client/react"
import type { ReactNode } from "react"

function makeClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: "/api/graphql",
      credentials: "same-origin",
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            clients: { merge: false },
            entities: { merge: false },
            assets: { merge: false },
            documents: { merge: false },
            documentRequests: { merge: false },
            tasks: { merge: false },
            reports: { merge: false },
            complianceControls: { merge: false },
            notifications: { merge: false },
            ledgerEvents: { merge: false },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  })
}

let browserClient: ApolloClient | undefined

function getClient() {
  if (typeof window === "undefined") {
    return makeClient()
  }
  if (!browserClient) {
    browserClient = makeClient()
  }
  return browserClient
}

export function ApolloProviderWrapper({ children }: { children: ReactNode }) {
  const client = getClient()
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
