import { z } from "zod";

const SORT_OPTIONS = ["popularity", "release_date_desc", "title_asc"] as const;

const searchField = z
  .union([z.string(), z.undefined()])
  .transform((value) => sanitizeSearch(value))
  .refine((value) => !value || value.length <= 256, "search must be 256 characters or fewer");

const isoDateField = z
  .union([z.string(), z.undefined()])
  .transform((value) => sanitizeDate(value))
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), "date filters must be valid ISO 8601 strings");

const gamesSearchSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    search: searchField,
    genres: z.array(z.string()).default([]),
    releasedAfter: isoDateField,
    releasedBefore: isoDateField,
    sort: z.enum(SORT_OPTIONS).default("popularity"),
  })
  .superRefine((value, ctx) => {
    if (value.releasedAfter && value.releasedBefore) {
      const after = Date.parse(value.releasedAfter);
      const before = Date.parse(value.releasedBefore);
      if (after > before) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["releasedAfter"],
          message: "releasedAfter must be earlier than releasedBefore",
        });
      }
    }
  });

export type GamesSearchQuery = z.infer<typeof gamesSearchSchema>;
export type GamesSearchSort = (typeof SORT_OPTIONS)[number];

export const parseGamesSearchParams = (params: URLSearchParams): GamesSearchQuery => {
  const raw = {
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    search: params.get("search") ?? undefined,
    genres: collectGenres(params),
    releasedAfter: params.get("releasedAfter") ?? undefined,
    releasedBefore: params.get("releasedBefore") ?? undefined,
    sort: params.get("sort") ?? undefined,
  };

  return gamesSearchSchema.parse(raw);
};

const collectGenres = (params: URLSearchParams): string[] => {
  const rawValues = [...params.getAll("genres[]"), ...params.getAll("genres")];

  const unique: string[] = [];
  for (const value of rawValues) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    if (!unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  }

  return unique;
};

const sanitizeSearch = (value?: string): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length ? normalized : undefined;
};

const sanitizeDate = (value?: string): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};
