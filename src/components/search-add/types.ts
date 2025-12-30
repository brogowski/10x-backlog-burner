import type { GamesListDTO, GameSummaryDTO } from "@/types"

export type SortOption = "popularity" | "release_date_desc" | "title_asc"

export type SearchFiltersVM = {
  search: string
  genres: string[]
  releasedAfter?: string
  releasedBefore?: string
  sort: SortOption
  page: number
  pageSize: number
}

export type GameCardVM = GameSummaryDTO & {
  isInBacklog?: boolean
  isInProgress?: boolean
  addDisabledReason?: string
}

export type PaginationState = {
  page: number
  pageSize: number
  total: number
}

export type RateLimitState = {
  isRateLimited: boolean
  limit?: number
  remaining?: number
  reset?: number
  retryAfter?: number
}

export type CapState = {
  max: number
  current: number
  canAdd: boolean
  notice?: string
}

export type AddStatus = "idle" | "pending" | "success" | "error"

