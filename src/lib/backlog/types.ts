import type { RateLimitMetadata } from "@/lib/in-progress/types"
import type { GamePlayStatus, UserGamesListDTO } from "@/types"

export type BacklogGameItemVM = {
  steamAppId: number
  title: string
  status: GamePlayStatus
  lastUpdatedAt: string
  importedAt: string
  achievementsUnlocked?: number | null
  achievementsTotal?: number | null
  popularityScore?: number | null
  slug: string
  isPendingAddToInProgress?: boolean
  isPendingRemove?: boolean
}

export type BacklogPageVM = {
  items: BacklogGameItemVM[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export type FetchBacklogQuery = {
  status: "backlog"
  page: number
  pageSize: number
  orderBy?: "updated_at" | "popularity_score"
}

export type AddToInProgressRequest = {
  status: "in_progress"
  inProgressPosition: number
}

export type UseBacklogResult = {
  backlog: BacklogPageVM | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  rateLimit: RateLimitMetadata | null
  activeItemMutations: Record<number, "addToInProgress" | "remove" | "idle">
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  addToInProgress: (item: BacklogGameItemVM) => Promise<void>
  removeFromBacklog: (item: BacklogGameItemVM) => Promise<void>
}

const sortByUpdatedAtDesc = (a: string, b: string) => {
  const aTime = Date.parse(a)
  const bTime = Date.parse(b)

  if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
    return 0
  }

  return bTime - aTime
}

export const mapUserGamesToBacklogPage = (
  dto: UserGamesListDTO,
  existing?: BacklogPageVM,
): BacklogPageVM => {
  const filtered = dto.results.filter(
    (item) => item.status === "backlog" && item.gameId != null && Boolean(item.title),
  )

  const newItems = [...filtered]
    .sort((a, b) => sortByUpdatedAtDesc(a.updatedAt, b.updatedAt))
    .map<BacklogGameItemVM>((item) => ({
      steamAppId: item.gameId,
      title: item.title,
      status: item.status,
      lastUpdatedAt: item.updatedAt,
      importedAt: item.importedAt,
      achievementsUnlocked: item.achievementsUnlocked,
      achievementsTotal: null,
      popularityScore: item.popularityScore,
      slug: item.slug,
    }))

  const combined: BacklogGameItemVM[] = []
  const dedupe = new Map<number, BacklogGameItemVM>()

  const seedItems = existing?.items ?? []
  for (const item of seedItems) {
    combined.push(item)
    dedupe.set(item.steamAppId, item)
  }

  for (const item of newItems) {
    if (dedupe.has(item.steamAppId)) {
      continue
    }
    combined.push(item)
    dedupe.set(item.steamAppId, item)
  }

  const total = dto.total

  return {
    items: combined,
    page: dto.page,
    pageSize: dto.pageSize,
    total,
    hasMore: combined.length < total,
  }
}

