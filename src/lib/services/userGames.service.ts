import type { PostgrestError } from "@supabase/supabase-js"

import type { SupabaseClient } from "../../db/supabase.client.ts"
import type { Tables } from "../../db/database.types.ts"
import type {
  GamePlayStatus,
  CompleteUserGameCommand,
  ReorderInProgressResultDTO,
  UpdateUserGameCommand,
  UserGameDTO,
  UserGamesListDTO,
} from "../../types.ts"

export type UserGamesFilters = {
  page: number
  pageSize: number
  statuses: ReadonlyArray<GamePlayStatus>
  search?: string
  orderBy: "in_progress_position" | "updated_at" | "popularity_score"
  orderDirection: "asc" | "desc"
}

const IN_PROGRESS_CAP = 5

type UserGameSelection = Tables<"user_games"> & {
  games: Tables<"games"> | null
}

type UserGameInsertPayload = {
  userId: string
  gameId: number
  status: GamePlayStatus
  inProgressPosition: number | null
}

type ReorderItem = {
  steamAppId: number
  position: number
}

const ORDER_NULLS_LAST: Record<UserGamesFilters["orderBy"], boolean> = {
  in_progress_position: false,
  updated_at: false,
  popularity_score: false,
}

export const listUserGames = async (
  userId: string,
  filters: UserGamesFilters,
  supabase: SupabaseClient,
): Promise<UserGamesListDTO> => {
  const offset = (filters.page - 1) * filters.pageSize
  const limit = offset + filters.pageSize - 1

  let query = supabase
    .from("user_games")
    .select(
      "game_id, status, in_progress_position, achievements_unlocked, completed_at, imported_at, updated_at, removed_at, games!inner(steam_app_id, title, slug, popularity_score)",
      { count: "exact", head: false },
    )
    .eq("user_id", userId)

  if (filters.statuses.length) {
    query = query.in("status", filters.statuses)
  }

  if (filters.search) {
    query = query.textSearch("search_tsv", filters.search, {
      type: "websearch",
      foreignTable: "games",
    })
  }

  const isGameOrder = filters.orderBy === "popularity_score"
  query = query.order(filters.orderBy, {
    ascending: filters.orderDirection === "asc",
    nullsFirst: ORDER_NULLS_LAST[filters.orderBy] === false ? false : undefined,
    foreignTable: isGameOrder ? "games" : undefined,
  })

  const { data, error, count } = await query.range(offset, limit)

  if (error) {
    throw createUserGamesServiceError(error)
  }

  const results = (data ?? []).map(mapRowToDto)

  return {
    page: filters.page,
    pageSize: filters.pageSize,
    total: typeof count === "number" ? count : results.length,
    results,
  }
}

export const createUserGame = async (
  payload: UserGameInsertPayload,
  supabase: SupabaseClient,
): Promise<UserGameDTO> => {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("steam_app_id, title, slug, popularity_score")
    .eq("steam_app_id", payload.gameId)
    .single()

  if (gameError) {
    throw createUserGamesServiceError(gameError, "BacklogCreateFailed")
  }

  if (!game) {
    throw new UserGamesServiceError("NotFound", "Game not found.")
  }

  const { data, error } = await supabase
    .from("user_games")
    .insert({
      user_id: payload.userId,
      game_id: payload.gameId,
      status: payload.status,
      in_progress_position: payload.inProgressPosition,
    })
    .select(
      "game_id, status, in_progress_position, achievements_unlocked, completed_at, imported_at, updated_at, removed_at, games!inner(steam_app_id, title, slug, popularity_score)",
    )
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw new UserGamesServiceError("DuplicateEntry", "User game already exists.", {
        details: {
          code: error.code,
          message: error.message,
          hint: error.hint,
        },
      })
    }

    throw createUserGamesServiceError(error, "BacklogCreateFailed")
  }

  return mapRowToDto(assertSelection(data))
}

export const reorderInProgress = async (
  userId: string,
  items: ReadonlyArray<ReorderItem>,
  supabase: SupabaseClient,
): Promise<ReorderInProgressResultDTO> => {
  const { data: existing, error: fetchError } = await supabase
    .from("user_games")
    .select("game_id, in_progress_position")
    .eq("user_id", userId)
    .eq("status", "in_progress")

  if (fetchError) {
    throw createUserGamesServiceError(fetchError, "BacklogReorderFailed")
  }

  const existingIds = new Set((existing ?? []).map((row) => row.game_id))
  const incomingIds = new Set(items.map((item) => item.steamAppId))

  const countsMatch = existingIds.size === incomingIds.size
  const coversAll =
    countsMatch &&
    Array.from(existingIds).every((id) => incomingIds.has(id)) &&
    Array.from(incomingIds).every((id) => existingIds.has(id))

  if (!coversAll) {
    throw new UserGamesServiceError(
      "QueueMismatch",
      "Submitted items do not match current in-progress queue.",
      { details: { expected: Array.from(existingIds), received: Array.from(incomingIds) } },
    )
  }

  let updated = 0
  for (const item of items) {
    const { error } = await supabase
      .from("user_games")
      .update({ in_progress_position: -item.position })
      .eq("user_id", userId)
      .eq("game_id", item.steamAppId)
      .eq("status", "in_progress")

    if (error) {
      if (isUniqueViolation(error)) {
        throw new UserGamesServiceError(
          "DuplicatePositions",
          "Conflicting in-progress positions.",
          { details: error },
        )
      }

      throw createUserGamesServiceError(error, "BacklogReorderFailed")
    }
    updated += 1
  }

  for (const item of items) {
    const { error } = await supabase
      .from("user_games")
      .update({ in_progress_position: item.position })
      .eq("user_id", userId)
      .eq("game_id", item.steamAppId)
      .eq("status", "in_progress")

    if (error) {
      if (isUniqueViolation(error)) {
        throw new UserGamesServiceError(
          "DuplicatePositions",
          "Conflicting in-progress positions.",
          { details: error },
        )
      }

      throw createUserGamesServiceError(error, "BacklogReorderFailed")
    }
  }

  return { updated }
}

export const updateUserGame = async (
  userId: string,
  steamAppId: number,
  command: UpdateUserGameCommand,
  supabase: SupabaseClient,
): Promise<UserGameDTO> => {
  const existing = await fetchUserGame(userId, steamAppId, supabase)
  const targetStatus = command.status ?? existing.status

  if (!isValidTransition(existing.status, targetStatus)) {
    throw new UserGamesServiceError(
      "InvalidStatusTransition",
      `Status ${existing.status} cannot transition to ${targetStatus}.`,
    )
  }

  const enteringInProgress =
    existing.status !== "in_progress" && targetStatus === "in_progress"

  if (enteringInProgress) {
    await ensureInProgressCapacity(userId, supabase)
  }

  const nextPosition = deriveInProgressPosition(existing, command, targetStatus)
  const nextAchievements = deriveAchievements(existing, command)

  const { data, error } = await supabase
    .from("user_games")
    .update({
      status: targetStatus,
      in_progress_position: nextPosition,
      achievements_unlocked: nextAchievements,
      removed_at: targetStatus === "removed" ? new Date().toISOString() : existing.removed_at,
    })
    .eq("user_id", userId)
    .eq("game_id", steamAppId)
    .select(
      "game_id, status, in_progress_position, achievements_unlocked, completed_at, imported_at, updated_at, removed_at, games!inner(steam_app_id, title, slug, popularity_score, achievements_total)",
    )
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw new UserGamesServiceError(
        "DuplicatePositions",
        "Conflicting in-progress positions.",
        { details: error },
      )
    }

    throw createUserGamesServiceError(error, "BacklogUpdateFailed")
  }

  if (!data) {
    throw new UserGamesServiceError("EntryNotFound", "User game not found.")
  }

  return mapRowToDto(assertSelection(data))
}

export const completeUserGame = async (
  userId: string,
  steamAppId: number,
  command: CompleteUserGameCommand,
  supabase: SupabaseClient,
): Promise<UserGameDTO> => {
  const existing = await fetchUserGame(userId, steamAppId, supabase)

  if (!["backlog", "in_progress"].includes(existing.status)) {
    throw new UserGamesServiceError(
      "InvalidStatusTransition",
      `Cannot complete from status ${existing.status}.`,
    )
  }

  const nextAchievements = deriveAchievements(existing, {
    achievementsUnlocked: command.achievementsUnlocked,
  })

  const completedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from("user_games")
    .update({
      status: "completed",
      in_progress_position: null,
      achievements_unlocked: nextAchievements,
      completed_at: completedAt,
      removed_at: null,
    })
    .eq("user_id", userId)
    .eq("game_id", steamAppId)
    .select(
      "game_id, status, in_progress_position, achievements_unlocked, completed_at, imported_at, updated_at, removed_at, games!inner(steam_app_id, title, slug, popularity_score, achievements_total)",
    )
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw new UserGamesServiceError(
        "DuplicatePositions",
        "Conflicting in-progress positions.",
        { details: error },
      )
    }

    throw createUserGamesServiceError(error, "CompletionFailed")
  }

  if (!data) {
    throw new UserGamesServiceError("EntryNotFound", "User game not found.")
  }

  return mapRowToDto(assertSelection(data))
}

export const removeUserGame = async (
  userId: string,
  steamAppId: number,
  supabase: SupabaseClient,
): Promise<void> => {
  const existing = await fetchUserGame(userId, steamAppId, supabase)

  const { error } = await supabase
    .from("user_games")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      in_progress_position: null,
    })
    .eq("user_id", userId)
    .eq("game_id", steamAppId)

  if (error) {
    throw createUserGamesServiceError(error, "BacklogUpdateFailed")
  }

  return
}

const mapRowToDto = (row: UserGameSelection): UserGameDTO => {
  if (!row.games) {
    throw new UserGamesServiceError(
      "BacklogFetchFailed",
      "User game row missing associated game.",
    )
  }

  return {
    gameId: row.game_id,
    title: row.games.title,
    status: row.status,
    inProgressPosition: row.in_progress_position,
    achievementsUnlocked: row.achievements_unlocked,
    completedAt: row.completed_at,
    importedAt: row.imported_at,
    updatedAt: row.updated_at,
    removedAt: row.removed_at,
    popularityScore: row.games.popularity_score,
    slug: row.games.slug,
  }
}

export class UserGamesServiceError extends Error {
  constructor(
    public readonly code:
      | "BacklogFetchFailed"
      | "BacklogCreateFailed"
      | "BacklogUpdateFailed"
      | "CompletionFailed"
      | "BacklogReorderFailed"
      | "DuplicateEntry"
      | "NotFound"
      | "EntryNotFound"
      | "QueueMismatch"
      | "DuplicatePositions"
      | "InProgressCapReached"
      | "InvalidStatusTransition"
      | "PositionRequiredForInProgress"
      | "InvalidPayload"
      | "DeleteNotAllowed",
    message: string,
    options?: { details?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.details = options?.details
  }

  readonly details?: unknown
}

const createUserGamesServiceError = (
  error: PostgrestError,
  code: UserGamesServiceError["code"] = "BacklogFetchFailed",
) =>
  new UserGamesServiceError(
    code,
    "Failed to query user games.",
    {
      cause: error,
      details: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    },
  )

const assertSelection = (row: unknown): UserGameSelection => row as UserGameSelection

const isUniqueViolation = (error: PostgrestError) => error.code === "23505"

const fetchUserGame = async (
  userId: string,
  steamAppId: number,
  supabase: SupabaseClient,
): Promise<UserGameSelection> => {
  const { data, error } = await supabase
    .from("user_games")
    .select(
      "game_id, status, in_progress_position, achievements_unlocked, completed_at, imported_at, updated_at, removed_at, games!inner(steam_app_id, title, slug, popularity_score, achievements_total)",
    )
    .eq("user_id", userId)
    .eq("game_id", steamAppId)
    .single()

  if (error) {
    if (error.code === "PGRST116" || error.code === "PGRST302") {
      throw new UserGamesServiceError("EntryNotFound", "User game not found.", {
        details: { code: error.code, message: error.message },
      })
    }

    throw createUserGamesServiceError(error, "BacklogUpdateFailed")
  }

  if (!data) {
    throw new UserGamesServiceError("EntryNotFound", "User game not found.")
  }

  return assertSelection(data)
}

const ensureInProgressCapacity = async (
  userId: string,
  supabase: SupabaseClient,
): Promise<void> => {
  const { count, error } = await supabase
    .from("user_games")
    .select("game_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "in_progress")

  if (error) {
    throw createUserGamesServiceError(error, "BacklogUpdateFailed")
  }

  if (typeof count === "number" && count >= IN_PROGRESS_CAP) {
    throw new UserGamesServiceError(
      "InProgressCapReached",
      "In-progress queue is full.",
      { details: { cap: IN_PROGRESS_CAP } },
    )
  }
}

const isValidTransition = (from: GamePlayStatus, to: GamePlayStatus) => {
  if (from === to) return true

  switch (from) {
    case "backlog":
      return to === "in_progress" || to === "removed"
    case "in_progress":
      return to === "completed" || to === "backlog"
    case "completed":
      return to === "backlog"
    case "removed":
      return false
    default:
      return false
  }
}

const deriveInProgressPosition = (
  existing: UserGameSelection,
  command: UpdateUserGameCommand,
  targetStatus: GamePlayStatus,
): number | null => {
  const incoming = command.inProgressPosition
  const existingPosition = existing.in_progress_position

  if (targetStatus === "in_progress") {
    const next = incoming ?? existingPosition
    if (next === null || next === undefined) {
      throw new UserGamesServiceError(
        "PositionRequiredForInProgress",
        "inProgressPosition is required when status is in_progress.",
      )
    }
    return next
  }

  if (
    incoming !== undefined &&
    incoming !== null 
  ) {
    throw new UserGamesServiceError(
      "PositionRequiredForInProgress",
      "inProgressPosition must be null unless status is in_progress.",
    )
  }

  return null
}

const deriveAchievements = (
  existing: UserGameSelection,
  command: Pick<UpdateUserGameCommand, "achievementsUnlocked">,
): number => {
  const next = command.achievementsUnlocked ?? existing.achievements_unlocked ?? 0
  const total = existing.games?.achievements_total

  if (typeof total === "number" && next > total) {
    throw new UserGamesServiceError(
      "InvalidPayload",
      "achievementsUnlocked exceeds total achievements for the game.",
      { details: { provided: next, total } },
    )
  }

  return next
}