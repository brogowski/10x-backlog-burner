import { z } from "zod";

import type { GamePlayStatus } from "../../types.ts";

const STATUSES = ["backlog", "in_progress", "completed", "removed"] as const;
const ORDERABLE_FIELDS = ["in_progress_position", "updated_at", "popularity_score"] as const;
const steamAppIdParamSchema = z.coerce.number().int().positive();

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
};

const statusArray = z.array(z.enum(STATUSES)).transform((values) => Array.from(new Set(values)));

const querySchema = z.object({
  statuses: statusArray.default([]),
  search: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => sanitizeSearch(value ?? undefined))
    .refine((value) => !value || value.length <= 256, "search must be 256 characters or fewer"),
  orderBy: z.enum(ORDERABLE_FIELDS).default("updated_at"),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  ...paginationFields,
});

const createUserGameSchema = z
  .object({
    steamAppId: z.coerce.number().int().positive(),
    status: z.enum(STATUSES),
    inProgressPosition: z.union([z.null(), z.coerce.number().int().min(1)]).default(null),
  })
  .superRefine((value, ctx) => {
    const requiresPosition = value.status === "in_progress";
    if (requiresPosition && value.inProgressPosition === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inProgressPosition"],
        message: "inProgressPosition is required when status is in_progress",
      });
    }

    const allowsNullPosition = value.status !== "in_progress";
    if (allowsNullPosition && value.inProgressPosition !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inProgressPosition"],
        message: "inProgressPosition must be null unless status is in_progress",
      });
    }
  });

const reorderItemSchema = z.object({
  steamAppId: z.coerce.number().int().positive(),
  position: z.coerce.number().int().min(1),
});

const reorderSchema = z
  .object({
    items: z.array(reorderItemSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const seenAppIds = new Set<number>();
    const seenPositions = new Set<number>();

    for (const [index, item] of value.items.entries()) {
      if (seenAppIds.has(item.steamAppId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "steamAppId"],
          message: "steamAppId values must be unique",
        });
      } else {
        seenAppIds.add(item.steamAppId);
      }

      if (seenPositions.has(item.position)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "position"],
          message: "position values must be unique",
        });
      } else {
        seenPositions.add(item.position);
      }
    }
  });

const updateUserGameSchema = z
  .object({
    status: z.enum(["backlog", "in_progress"]).optional(),
    inProgressPosition: z.union([z.null(), z.coerce.number().int().min(1)]).optional(),
    achievementsUnlocked: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyField =
      value.status !== undefined || value.inProgressPosition !== undefined || value.achievementsUnlocked !== undefined;

    if (!hasAnyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
      return;
    }

    if (value.status === "in_progress" && value.inProgressPosition === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inProgressPosition"],
        message: "inProgressPosition is required when status is in_progress",
      });
    }

    if (
      value.status &&
      value.status !== "in_progress" &&
      value.inProgressPosition !== undefined &&
      value.inProgressPosition !== null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inProgressPosition"],
        message: "inProgressPosition must be null unless status is in_progress",
      });
    }
  });

const completeUserGameSchema = z.object({
  achievementsUnlocked: z.coerce.number().int().min(0).optional(),
});

export type UserGamesQuery = z.infer<typeof querySchema>;
export type CreateUserGamePayload = z.infer<typeof createUserGameSchema>;
export type ReorderInProgressPayload = z.infer<typeof reorderSchema>;
export type UpdateUserGamePayload = z.infer<typeof updateUserGameSchema>;
export type CompleteUserGamePayload = z.infer<typeof completeUserGameSchema>;

export const parseUserGamesQuery = (params: URLSearchParams): UserGamesQuery => {
  const rawStatuses = collectStatuses(params);
  const raw = {
    statuses: rawStatuses,
    search: params.get("search") ?? undefined,
    orderBy: params.get("orderBy") ?? undefined,
    orderDirection: params.get("orderDirection") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  };

  const parsed = querySchema.parse(raw);
  const onlyInProgress = parsed.statuses.length > 0 && parsed.statuses.every((status) => status === "in_progress");

  if (raw.orderBy === undefined && onlyInProgress) {
    return {
      ...parsed,
      orderBy: "in_progress_position",
      orderDirection: "asc",
    };
  }

  if (raw.orderBy === undefined) {
    return {
      ...parsed,
      orderBy: "updated_at",
      orderDirection: "desc",
    };
  }

  if (raw.orderDirection === undefined && parsed.orderBy === "in_progress_position") {
    return { ...parsed, orderDirection: "asc" };
  }

  return parsed;
};

export const parseCreateUserGame = (payload: unknown): CreateUserGamePayload => createUserGameSchema.parse(payload);

export const parseReorderInProgress = (payload: unknown): ReorderInProgressPayload => reorderSchema.parse(payload);

export const parseUpdateUserGame = (payload: unknown): UpdateUserGamePayload => updateUserGameSchema.parse(payload);

export const parseCompleteUserGame = (payload: unknown): CompleteUserGamePayload =>
  completeUserGameSchema.parse(payload ?? {});

export const parseSteamAppIdParam = (value: unknown): number => steamAppIdParamSchema.parse(value);

const collectStatuses = (params: URLSearchParams): GamePlayStatus[] => {
  const values = [...params.getAll("status[]"), ...params.getAll("status")].filter(
    (value) => value !== null && value !== undefined
  );

  const unique: GamePlayStatus[] = [];
  for (const value of values) {
    const normalized = value.trim() as GamePlayStatus;
    if (!normalized || unique.includes(normalized)) {
      continue;
    }
    unique.push(normalized);
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
