"use client"

import { useReducer, useEffect, useCallback, useRef } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface HasId {
  id: string
}

type CrudAction<T extends HasId> =
  | { type: "SET_ALL"; payload: T[] }
  | { type: "ADD"; payload: T }
  | { type: "UPDATE"; payload: { id: string; patch: Partial<T> } }
  | { type: "REMOVE"; payload: string }

interface CrudState<T extends HasId> {
  items: T[]
  isLoading: boolean
}

export interface UseCrudStateReturn<T extends HasId> {
  data: T[]
  isLoading: boolean
  add: (item: T) => void
  update: (id: string, patch: Partial<T>) => void
  remove: (id: string) => void
  getById: (id: string) => T | undefined
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function crudReducer<T extends HasId>(
  state: CrudState<T>,
  action: CrudAction<T>
): CrudState<T> {
  switch (action.type) {
    case "SET_ALL":
      return { ...state, items: action.payload, isLoading: false }
    case "ADD":
      return { ...state, items: [action.payload, ...state.items] }
    case "UPDATE":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.patch }
            : item
        ),
      }
    case "REMOVE":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      }
    default:
      return state
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
// Accepts a fetchFn (your service layer function) and returns CRUD operations.
//
// SWAP TO tRPC:
//   Replace this hook's internals with trpc.*.useQuery() + useMutation().
//   The consuming component's API stays the same.

export function useCrudState<T extends HasId>(
  fetchFn: () => Promise<T[]>
): UseCrudStateReturn<T> {
  const [state, dispatch] = useReducer(crudReducer<T>, {
    items: [],
    isLoading: true,
  })

  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    fetchFn().then((data) => {
      dispatch({ type: "SET_ALL", payload: data })
    })
  }, [fetchFn])

  const add = useCallback((item: T) => {
    dispatch({ type: "ADD", payload: item })
  }, [])

  const update = useCallback((id: string, patch: Partial<T>) => {
    dispatch({ type: "UPDATE", payload: { id, patch } })
  }, [])

  const remove = useCallback((id: string) => {
    dispatch({ type: "REMOVE", payload: id })
  }, [])

  const getById = useCallback(
    (id: string) => state.items.find((item) => item.id === id),
    [state.items]
  )

  return {
    data: state.items,
    isLoading: state.isLoading,
    add,
    update,
    remove,
    getById,
  }
}
