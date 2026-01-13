import type { PostgrestError } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../../db/supabase.client.ts";
import type { Tables } from "../../../db/database.types.ts";
import type { GameSummaryDTO, GamesListDTO } from "../../../types.ts";
import type { GamesSearchSort } from "../../validation/gamesSearch.schema.ts";

export interface GamesSearchFilters {
  page: number;
  pageSize: number;
  search?: string;
  genres: readonly string[];
  releasedAfter?: string;
  releasedBefore?: string;
  sort: GamesSearchSort;
}

type GameRow = Tables<"games">;

type GameSelection = Pick<
  GameRow,
  | "steam_app_id"
  | "title"
  | "slug"
  | "genres"
  | "release_date"
  | "popularity_score"
  | "artwork_url"
  | "achievements_total"
>;

interface SortConfig {
  nullsFirst?: boolean;
  column: keyof GameRow;
  ascending: boolean;
}

const SORT_MAPPING: Record<GamesSearchSort, SortConfig> = {
  popularity: {
    column: "popularity_score",
    ascending: false,
    nullsFirst: false,
  },
  release_date_desc: {
    column: "release_date",
    ascending: false,
    nullsFirst: false,
  },
  title_asc: {
    column: "title",
    ascending: true,
    nullsFirst: false,
  },
};

export const searchGames = async (filters: GamesSearchFilters, supabase: SupabaseClient): Promise<GamesListDTO> => {
  const offset = (filters.page - 1) * filters.pageSize;
  const limit = offset + filters.pageSize - 1;

  let query = supabase
    .from("games")
    .select("steam_app_id, title, slug, genres, release_date, popularity_score, artwork_url, achievements_total", {
      count: "exact",
      head: false,
    });

  if (filters.search) {
    query = query.textSearch("search_tsv", filters.search, {
      type: "websearch",
    });
  }

  if (filters.genres.length) {
    query = query.overlaps("genres", Array.from(filters.genres));
  }

  if (filters.releasedAfter) {
    query = query.gte("release_date", filters.releasedAfter);
  }

  if (filters.releasedBefore) {
    query = query.lte("release_date", filters.releasedBefore);
  }

  const sortConfig = SORT_MAPPING[filters.sort];
  const sortColumn = sortConfig.column as string;

  query = query.order(sortColumn, {
    ascending: sortConfig.ascending,
    nullsFirst: sortConfig.nullsFirst,
  });

  const { data, error, count } = await query.range(offset, limit);

  if (error) {
    throw createCatalogQueryError(error);
  }

  const results = (data ?? []).map(mapGameRowToDto);

  return {
    page: filters.page,
    pageSize: filters.pageSize,
    total: typeof count === "number" ? count : results.length,
    results,
  };
};

const mapGameRowToDto = (row: GameSelection): GameSummaryDTO => ({
  steamAppId: row.steam_app_id,
  title: row.title,
  slug: row.slug,
  genres: row.genres,
  releaseDate: row.release_date,
  popularityScore: row.popularity_score,
  artworkUrl: row.artwork_url,
  achievementsTotal: row.achievements_total,
});

export class CatalogServiceError extends Error {
  constructor(
    public readonly code: "CatalogQueryFailed",
    message: string,
    options?: { details?: unknown; cause?: unknown }
  ) {
    super(message, { cause: options?.cause });
    this.details = options?.details;
  }

  readonly details?: unknown;
}

const createCatalogQueryError = (error: PostgrestError) =>
  new CatalogServiceError("CatalogQueryFailed", "Failed to query games catalog.", {
    cause: error,
    details: {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    },
  });
