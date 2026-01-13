import {
  IN_PROGRESS_CAP,
  type CompleteUserGameViewPayload,
  type InProgressQueueVM,
  type RateLimitMetadata,
  type ReorderInProgressRequest,
  type ReorderInProgressResult,
  type UpdateUserGameStatusRequest,
  mapUserGamesToQueue,
} from "@/lib/in-progress/types";
import type { ReorderInProgressResultDTO, UserGamesListDTO, UserGameDTO } from "@/types";

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly rateLimit?: RateLimitMetadata
  ) {
    super(message);
  }
}

const SUPABASE_AUTH_TOKEN =
  "yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjU0MzIxL2F1dGgvdjEiLCJzdWIiOiJkODcxMTFmOC0yNDc4LTQyOGYtYjYxOC1lOWVjODRiNTJmNjEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY2MjM4MzkzLCJpYXQiOjE3NjYyMzQ3OTMsImVtYWlsIjoiYmFydGxvbWllai5yb2dvd3NraUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2NjIzNDc5M31dLCJzZXNzaW9uX2lkIjoiNGVhZDI3MjgtOTkzNy00ZjBiLTk1Y2EtZjFkNjk3YTY0ZDBlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.GmDfNKEbQJXBh3LmhUk64DRIQ_1ZJ8vVSsosPoIBcpo";

export const defaultJsonHeaders = { "content-type": "application/json" };

export const buildAuthHeaders = (extra?: HeadersInit) => ({
  ...extra,
  "sb-auth-token": SUPABASE_AUTH_TOKEN,
});

export const parseRateLimitHeaders = (response: Response): RateLimitMetadata => {
  const limit = response.headers.get("x-ratelimit-limit");
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  const retryAfter = response.headers.get("retry-after");

  return {
    limit: limit ? Number(limit) : undefined,
    remaining: remaining ? Number(remaining) : undefined,
    reset: reset ? Number(reset) : undefined,
    retryAfter: retryAfter ? Number(retryAfter) : undefined,
  };
};

const parseJsonBody = async <T>(response: Response): Promise<T | undefined> => {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
};

export const handleResponse = async <T>(response: Response): Promise<{ data: T; rateLimit: RateLimitMetadata }> => {
  const rateLimit = parseRateLimitHeaders(response);

  if (response.ok) {
    const json = await parseJsonBody<T>(response);
    if (json === undefined) {
      throw new ApiError("Empty response payload.", response.status, undefined, undefined, rateLimit);
    }
    return { data: json, rateLimit };
  }

  const json = await parseJsonBody<ApiErrorPayload>(response);
  const code = json?.error?.code;
  const message = json?.error?.message ?? `Request failed with status ${response.status}`;
  throw new ApiError(message, response.status, code, json?.error?.details, rateLimit);
};

export const fetchInProgressQueue = async (
  signal?: AbortSignal
): Promise<{ queue: InProgressQueueVM; rateLimit: RateLimitMetadata }> => {
  const params = new URLSearchParams({
    status: "in_progress",
    orderBy: "in_progress_position",
    orderDirection: "asc",
    page: "1",
    pageSize: IN_PROGRESS_CAP.toString(),
  });

  const response = await fetch(`/api/v1/user-games?${params.toString()}`, {
    method: "GET",
    headers: buildAuthHeaders(),
    signal,
  });

  const { data, rateLimit } = await handleResponse<UserGamesListDTO>(response);
  return { queue: mapUserGamesToQueue(data), rateLimit };
};

export const reorderInProgress = async (
  payload: ReorderInProgressRequest,
  signal?: AbortSignal
): Promise<{ result: ReorderInProgressResult; rateLimit: RateLimitMetadata }> => {
  const response = await fetch("/api/v1/user-games/reorder", {
    method: "PATCH",
    headers: buildAuthHeaders(defaultJsonHeaders),
    body: JSON.stringify(payload),
    signal,
  });

  const { data, rateLimit } = await handleResponse<ReorderInProgressResultDTO>(response);
  return { result: data, rateLimit };
};

export const completeUserGame = async (
  payload: CompleteUserGameViewPayload,
  signal?: AbortSignal
): Promise<{ result: UserGameDTO; rateLimit: RateLimitMetadata }> => {
  const response = await fetch(`/api/v1/user-games/${payload.steamAppId}/complete`, {
    method: "POST",
    headers: buildAuthHeaders(defaultJsonHeaders),
    body: JSON.stringify({ achievementsUnlocked: payload.achievementsUnlocked }),
    signal,
  });

  const { data, rateLimit } = await handleResponse<UserGameDTO>(response);
  return { result: data, rateLimit };
};

export const updateUserGameStatus = async (
  steamAppId: number,
  payload: UpdateUserGameStatusRequest,
  signal?: AbortSignal
): Promise<{ result: UserGameDTO; rateLimit: RateLimitMetadata }> => {
  const response = await fetch(`/api/v1/user-games/${steamAppId}`, {
    method: "PATCH",
    headers: buildAuthHeaders(defaultJsonHeaders),
    body: JSON.stringify(payload),
    signal,
  });

  const { data, rateLimit } = await handleResponse<UserGameDTO>(response);
  return { result: data, rateLimit };
};
