import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { parseRateLimitHeaders } from "@/lib/in-progress/inProgressApi"
import type { GamesListDTO } from "@/types"

import type { RateLimitState, SearchFiltersVM } from "./types"

type UseCatalogSearchOptions = {
  debounceMs?: number
}

type UseCatalogSearchResult = {
  results: GamesListDTO | null
  loading: boolean
  error: string | null
  rateLimit: RateLimitState | null
  refetch: () => void
}

export const useCatalogSearch = (
  filters: SearchFiltersVM,
  options?: UseCatalogSearchOptions,
): UseCatalogSearchResult => {
  const debounceMs = options?.debounceMs ?? 300
  const [results, setResults] = useState<GamesListDTO | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const queryString = useMemo(() => buildQueryString(filters), [filters])

  const runFetch = useCallback(
    async (isImmediate = false) => {
      const currentRequestId = ++requestIdRef.current

      if (abortRef.current) {
        abortRef.current.abort()
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      const execute = async () => {
        const controller = new AbortController()
        abortRef.current = controller
        setLoading(true)
        setError(null)

        try {
          const response = await fetch(`/api/v1/games?${queryString}`, {
            method: "GET",
            signal: controller.signal,
          })

          const rateHeaders = parseRateLimitHeaders(response)
          const nextRateLimit: RateLimitState = {
            isRateLimited: response.status === 429,
            limit: rateHeaders.limit,
            remaining: rateHeaders.remaining,
            reset: rateHeaders.reset,
            retryAfter: rateHeaders.retryAfter,
          }
          setRateLimit(nextRateLimit)

          if (!response.ok) {
            const body = await safeParseJson<{
              error?: { message?: string; code?: string }
            }>(response)

            const message =
              body?.error?.message ??
              (response.status === 429
                ? "You are sending requests too quickly. Please wait and retry."
                : "Unable to fetch games. Please try again.")
            throw new Error(message)
          }

          const json = await safeParseJson<GamesListDTO>(response)
          if (!json) {
            throw new Error("Empty response received from catalog.")
          }

          if (requestIdRef.current === currentRequestId) {
            setResults(json)
          }
        } catch (err) {
          if (controller.signal.aborted) {
            return
          }
          setResults(null)
          setError(err instanceof Error ? err.message : "Unable to fetch games. Please retry.")
        } finally {
          if (requestIdRef.current === currentRequestId) {
            setLoading(false)
          }
        }
      }

      if (isImmediate || debounceMs === 0) {
        execute()
      } else {
        debounceRef.current = setTimeout(execute, debounceMs)
      }
    },
    [debounceMs, queryString],
  )

  useEffect(() => {
    runFetch(false)
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [runFetch])

  const refetch = useCallback(() => runFetch(true), [runFetch])

  return { results, loading, error, rateLimit, refetch }
}

const buildQueryString = (filters: SearchFiltersVM) => {
  const params = new URLSearchParams()
  params.set("page", filters.page.toString())
  params.set("pageSize", filters.pageSize.toString())

  if (filters.search) params.set("search", filters.search)
  if (filters.genres.length) {
    for (const genre of filters.genres) {
      params.append("genres[]", genre)
    }
  }
  if (filters.releasedAfter) params.set("releasedAfter", filters.releasedAfter)
  if (filters.releasedBefore) params.set("releasedBefore", filters.releasedBefore)
  if (filters.sort) params.set("sort", filters.sort)

  return params.toString()
}

const safeParseJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

