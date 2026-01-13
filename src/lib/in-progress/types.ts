import type { GamePlayStatus, UserGamesListDTO } from "@/types";

export interface InProgressGameItemVM {
  steamAppId: number;
  title: string;
  status: GamePlayStatus;
  position: number;
  achievementsUnlocked?: number | null;
  achievementsTotal?: number | null;
  artworkUrl?: string | null;
  isPending?: boolean;
}

export interface InProgressQueueVM {
  items: InProgressGameItemVM[];
  total: number;
  cap: number;
  isAtCap: boolean;
}

export interface ReorderInProgressRequest {
  items: { steamAppId: number; position: number }[];
}

export interface ReorderInProgressResult {
  updated: number;
}

export interface CompleteUserGameViewPayload {
  steamAppId: number;
  achievementsUnlocked?: number;
}

export interface UpdateUserGameStatusRequest {
  status?: GamePlayStatus;
  inProgressPosition?: number | null;
  achievementsUnlocked?: number;
  completedAt?: string | null;
}

export type UndoEntry =
  | {
      kind: "reorder";
      previousQueue: InProgressQueueVM;
    }
  | {
      kind: "complete" | "remove";
      previousQueue: InProgressQueueVM;
      removedItem: InProgressGameItemVM;
    };

export interface RateLimitMetadata {
  limit?: number;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

export const IN_PROGRESS_CAP = 5;

export const mapUserGamesToQueue = (dto: UserGamesListDTO): InProgressQueueVM => {
  const sorted = [...dto.results]
    .filter((item) => item.status === "in_progress")
    .sort((a, b) => {
      const aPos = a.inProgressPosition ?? Number.MAX_SAFE_INTEGER;
      const bPos = b.inProgressPosition ?? Number.MAX_SAFE_INTEGER;
      return aPos - bPos;
    });

  const items = sorted.map(
    (item, index): InProgressGameItemVM => ({
      steamAppId: item.gameId,
      title: item.title,
      status: item.status,
      position: item.inProgressPosition ?? index + 1,
      achievementsUnlocked: item.achievementsUnlocked,
      // Placeholder values; to be enriched with catalog data in later steps.
      achievementsTotal: null,
      artworkUrl: null,
    })
  );

  const total = items.length;
  const cap = IN_PROGRESS_CAP;

  return {
    items,
    total,
    cap,
    isAtCap: total >= cap,
  };
};
