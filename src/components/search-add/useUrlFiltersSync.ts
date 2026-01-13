import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseGamesSearchParams } from "@/lib/validation/gamesSearch.schema";

import type { SearchFiltersVM, SortOption } from "./types";

export const DEFAULT_FILTERS: SearchFiltersVM = {
  search: "",
  genres: [],
  releasedAfter: undefined,
  releasedBefore: undefined,
  sort: "popularity",
  page: 1,
  pageSize: 25,
};

type FiltersUpdater = Partial<SearchFiltersVM> | ((prev: SearchFiltersVM) => Partial<SearchFiltersVM>);

interface UpdateOptions {
  resetPage?: boolean;
}

export const useUrlFiltersSync = (initial?: Partial<SearchFiltersVM>) => {
  const initialFilters = useMemo(() => deriveInitialFilters(initial), [initial]);
  const [filters, setFilters] = useState<SearchFiltersVM>(initialFilters);
  const lastSerialized = useRef<string>("");

  const updateFilters = useCallback((updater: FiltersUpdater, options?: UpdateOptions) => {
    setFilters((prev) => {
      const partial = typeof updater === "function" ? updater(prev) : { ...updater };
      const nextDraft = {
        ...prev,
        ...partial,
        page: options?.resetPage ? 1 : (partial.page ?? prev.page),
      };

      return sanitizeFilters(nextDraft);
    });
  }, []);

  const replaceFilters = useCallback((next: SearchFiltersVM) => {
    setFilters(sanitizeFilters(next));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = serializeFilters(filters);
    const serialized = params.toString();
    if (serialized === lastSerialized.current) {
      return;
    }

    lastSerialized.current = serialized;
    const newUrl = `${window.location.pathname}${serialized ? `?${serialized}` : ""}${window.location.hash}`;

    window.history.replaceState(null, "", newUrl);
  }, [filters]);

  return { filters, updateFilters, resetFilters, replaceFilters };
};

const deriveInitialFilters = (initial?: Partial<SearchFiltersVM>) => {
  const baseFromUrl =
    typeof window !== "undefined"
      ? mapQueryToViewModel(parseGamesSearchParams(new URLSearchParams(window.location.search)))
      : DEFAULT_FILTERS;

  return sanitizeFilters({ ...baseFromUrl, ...initial });
};

const mapQueryToViewModel = (query: ReturnType<typeof parseGamesSearchParams>): SearchFiltersVM => ({
  search: query.search ?? "",
  genres: query.genres ?? [],
  releasedAfter: query.releasedAfter ?? undefined,
  releasedBefore: query.releasedBefore ?? undefined,
  sort: query.sort,
  page: query.page,
  pageSize: query.pageSize,
});

const sanitizeFilters = (filters: SearchFiltersVM): SearchFiltersVM => {
  const allowedSorts: SortOption[] = ["popularity", "release_date_desc", "title_asc"];

  const sort = allowedSorts.includes(filters.sort) ? filters.sort : DEFAULT_FILTERS.sort;

  const search = filters.search.trim();
  const page = Number.isFinite(filters.page) && filters.page > 0 ? filters.page : 1;
  const pageSize =
    Number.isFinite(filters.pageSize) && filters.pageSize > 0
      ? Math.min(filters.pageSize, 100)
      : DEFAULT_FILTERS.pageSize;

  const genres = dedupe((filters.genres ?? []).map((genre) => genre.trim()).filter(Boolean));

  const releasedAfter = sanitizeDate(filters.releasedAfter);
  const releasedBefore = sanitizeDate(filters.releasedBefore);

  const hasConflict = releasedAfter && releasedBefore && Date.parse(releasedAfter) > Date.parse(releasedBefore);

  return {
    search,
    genres,
    releasedAfter: releasedAfter ?? undefined,
    releasedBefore: hasConflict ? undefined : (releasedBefore ?? undefined),
    sort,
    page,
    pageSize,
  };
};

const sanitizeDate = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString().slice(0, 10);
};

const dedupe = (values: string[]) => {
  const unique: string[] = [];
  for (const value of values) {
    if (!unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique;
};

const serializeFilters = (filters: SearchFiltersVM) => {
  const params = new URLSearchParams();
  if (filters.page > DEFAULT_FILTERS.page) {
    params.set("page", filters.page.toString());
  }
  if (filters.pageSize !== DEFAULT_FILTERS.pageSize) {
    params.set("pageSize", filters.pageSize.toString());
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.genres.length) {
    for (const genre of filters.genres) {
      params.append("genres[]", genre);
    }
  }
  if (filters.releasedAfter) {
    params.set("releasedAfter", filters.releasedAfter);
  }
  if (filters.releasedBefore) {
    params.set("releasedBefore", filters.releasedBefore);
  }
  if (filters.sort !== DEFAULT_FILTERS.sort) {
    params.set("sort", filters.sort);
  }

  return params;
};
