export interface RateLimitContext {
  limit: number;
  remaining: number;
  reset: number; // epoch seconds
  retryAfter?: number;
  isRateLimited?: boolean;
}

const RATE_LIMIT_HEADERS = {
  limit: "x-ratelimit-limit",
  remaining: "x-ratelimit-remaining",
  reset: "x-ratelimit-reset",
  retryAfter: "retry-after",
} as const;

export const withRateLimitHeaders = (response: Response, context?: RateLimitContext) => {
  if (!context) {
    return response;
  }

  response.headers.set(RATE_LIMIT_HEADERS.limit, context.limit.toString());
  response.headers.set(RATE_LIMIT_HEADERS.remaining, context.remaining.toString());
  response.headers.set(RATE_LIMIT_HEADERS.reset, context.reset.toString());

  if (typeof context.retryAfter === "number") {
    response.headers.set(RATE_LIMIT_HEADERS.retryAfter, context.retryAfter.toString());
  }

  return response;
};
