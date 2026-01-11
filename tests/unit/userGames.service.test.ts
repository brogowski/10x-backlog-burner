import { describe, expect, it, vi } from "vitest"
import type { PostgrestError as PostgrestErrorType } from "@supabase/supabase-js"
import { PostgrestError } from "@supabase/postgrest-js"
import type { SupabaseClient } from "@/db/supabase.client"
import {
  reorderInProgress,
  UserGamesServiceError,
} from "@/lib/services/userGames.service"

type ExecutionResult = {
  data?: unknown
  error?: PostgrestErrorType | null
}

const createSupabaseMock = (results: ExecutionResult[]) => {
  let callIndex = 0
  const updateCalls: Array<Record<string, unknown>> = []

  const makeBuilder = () => {
    const builder: Record<string, any> = {
      select: () => builder,
      update: (payload: Record<string, unknown>) => {
        updateCalls.push(payload)
        return builder
      },
      eq: () => builder,
      then: (resolve?: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        const result = results[callIndex++] ?? { data: null, error: null }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return builder
  }

  const supabase = { from: vi.fn(makeBuilder) } as unknown as SupabaseClient

  return {
    supabase,
    updateCalls,
  }
}

describe("reorderInProgress", () => {
  it("applies a two-pass update to avoid unique constraint collisions", async () => {
    const items = [
      { steamAppId: 101, position: 1 },
      { steamAppId: 202, position: 2 },
    ]

    const existing = [
      { game_id: 101, in_progress_position: 1 },
      { game_id: 202, in_progress_position: 2 },
    ]

    const updateResults = Array.from({ length: items.length * 2 }, () => ({
      data: null,
      error: null,
    }))

    const { supabase, updateCalls } = createSupabaseMock([
      { data: existing, error: null },
      ...updateResults,
    ])

    const result = await reorderInProgress("user-abc", items, supabase)

    expect(result).toEqual({ updated: items.length })
    expect(updateCalls.map((payload) => payload.in_progress_position)).toEqual([
      -1,
      -2,
      1,
      2,
    ])
  })

  it("fails when the submitted queue does not match the stored queue", async () => {
    const items = [{ steamAppId: 101, position: 1 }]
    const existing = [{ game_id: 101, in_progress_position: 1 }]
    const { supabase, updateCalls } = createSupabaseMock([
      { data: existing, error: null },
    ])

    await expect(reorderInProgress("user-bad", [{ steamAppId: 999, position: 5 }], supabase)).rejects.toMatchObject({
      code: "QueueMismatch",
    })
    expect(updateCalls).toHaveLength(0)
  })

  it("wraps unique violations as DuplicatePositions", async () => {
    const items = [{ steamAppId: 101, position: 1 }]
    const existing = [{ game_id: 101, in_progress_position: 1 }]
    const duplicateError = new PostgrestError({
      message: "unique constraint",
      details: "position conflict",
      hint: "try a different queue",
      code: "23505",
    })

    const { supabase } = createSupabaseMock([
      { data: existing, error: null },
      { data: null, error: duplicateError },
    ])

    await expect(reorderInProgress("user-dup", items, supabase)).rejects.toMatchObject({
      code: "DuplicatePositions",
    })
  })
})
