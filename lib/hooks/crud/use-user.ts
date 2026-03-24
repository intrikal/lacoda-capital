"use client"

import * as React from "react"
import { useTransition } from "react"
import { updateUserProfile } from "@/lib/actions/user.actions"
import type { UpdateUserProfileInput } from "@/lib/validations/user.schema"
import type { UserRecord } from "@/lib/types"

/**
 * useUpdateUserProfile — Hook for updating user profile information.
 *
 * Returns a mutate function and isPending state following the standard pattern.
 */
export function useUpdateUserProfile() {
  const [isPending, startTransition] = useTransition()

  const mutate = React.useCallback(
    (input: UpdateUserProfileInput, callbacks?: { onSuccess?: (data: UserRecord) => void; onError?: (error: Error) => void }) => {
      return new Promise<UserRecord | void>((resolve) => {
        startTransition(async () => {
          try {
            const result = await updateUserProfile(input)
            callbacks?.onSuccess?.(result)
            resolve(result)
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            callbacks?.onError?.(err)
            resolve()
          }
        })
      })
    },
    []
  )

  return { mutate, isPending }
}
