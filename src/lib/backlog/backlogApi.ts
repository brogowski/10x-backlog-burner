import {
  ApiError,
  buildAuthHeaders,
  defaultJsonHeaders,
  handleResponse,
  parseRateLimitHeaders,
} from "@/lib/in-progress/inProgressApi";
import { IN_PROGRESS_CAP, type RateLimitMetadata } from "@/lib/in-progress/types";
import { mapUserGamesToBacklogPage, type AddToInProgressRequest, type BacklogPageVM } from "@/lib/backlog/types";
import type { UserGamesListDTO, UserGameDTO } from "@/types";

export const BACKLOG_PAGE_SIZE = 50;

const buildListParams = (page: number) =>
  new URLSearchParams({
    status: "backlog",
    orderBy: "updated_at",
    orderDirection: "desc",
    page: page.toString(),
    pageSize: BACKLOG_PAGE_SIZE.toString(),
  });

export const fetchBacklogPage = async (
  page: number,
  signal?: AbortSignal
): Promise<{ page: UserGamesListDTO; rateLimit: RateLimitMetadata }> => {
  const response = await fetch(`/api/v1/user-games?${buildListParams(page).toString()}`, {
    method: "GET",
    headers: buildAuthHeaders(),
    signal,
  });

  const { data, rateLimit } = await handleResponse<UserGamesListDTO>(response);
  return { page: data, rateLimit };
};

export const fetchBacklogPageVM = async (
  page: number,
  existing?: BacklogPageVM,
  signal?: AbortSignal
): Promise<{ backlog: BacklogPageVM; rateLimit: RateLimitMetadata }> => {
  const { page: dto, rateLimit } = await fetchBacklogPage(page, signal);
  const backlog = mapUserGamesToBacklogPage(dto, existing);
  return { backlog, rateLimit };
};

export const fetchInProgressCount = async (
  signal?: AbortSignal
): Promise<{ count: number; rateLimit: RateLimitMetadata }> => {
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
  return { count: data.total ?? data.results.length, rateLimit };
};

export const addToInProgress = async (
  steamAppId: number,
  position?: number,
  signal?: AbortSignal
): Promise<{ result: UserGameDTO; rateLimit: RateLimitMetadata }> => {
  let derivedPosition = position;
  let upstreamRateLimit: RateLimitMetadata | undefined;

  if (derivedPosition == null) {
    const { count, rateLimit } = await fetchInProgressCount(signal);
    upstreamRateLimit = rateLimit;
    derivedPosition = Math.min(count + 1, IN_PROGRESS_CAP);
  }

  if (derivedPosition == null) {
    throw new ApiError("Unable to compute in-progress position.", 400);
  }

  const payload: AddToInProgressRequest = {
    status: "in_progress",
    inProgressPosition: derivedPosition,
  };

  const response = await fetch(`/api/v1/user-games/${steamAppId}`, {
    method: "PATCH",
    headers: buildAuthHeaders(defaultJsonHeaders),
    body: JSON.stringify(payload),
    signal,
  });

  const { data, rateLimit } = await handleResponse<UserGameDTO>(response);
  return { result: data, rateLimit: rateLimit ?? upstreamRateLimit ?? {} };
};

export const removeFromBacklog = async (
  steamAppId: number,
  signal?: AbortSignal
): Promise<{ rateLimit: RateLimitMetadata }> => {
  const response = await fetch(`/api/v1/user-games/${steamAppId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    signal,
  });

  const rateLimit = parseRateLimitHeaders(response);

  if (!response.ok) {
    await handleResponse<unknown>(response);
  }

  return { rateLimit };
};
