import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { listUserGames, createUserGame, UserGamesServiceError } from "../../../lib/services/userGames.service.ts";
import { createErrorResponse, createJsonResponse } from "../../../lib/http/responses.ts";
import { withRateLimitHeaders } from "../../../lib/http/rateLimit.ts";
import { logger } from "../../../lib/logger.ts";
import {
  parseCreateUserGame,
  parseUserGamesQuery,
  type CreateUserGamePayload,
  type UserGamesQuery,
} from "../../../lib/validation/userGames.schema.ts";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const requestId = locals.requestId ?? "unknown";
  const applyRateLimitHeaders = (response: Response) => withRateLimitHeaders(response, locals.rateLimit);

  let query: UserGamesQuery;
  try {
    query = parseUserGamesQuery(url.searchParams);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid user-games query params", {
        requestId,
        issues: error.issues,
      });
      return applyRateLimitHeaders(
        createErrorResponse({
          status: 400,
          code: "InvalidQuery",
          message: "One or more query parameters are invalid.",
          details: error.issues,
        })
      );
    }

    throw error;
  }

  if (locals.rateLimit?.isRateLimited) {
    logger.warn("Rate limit exceeded for GET /v1/user-games", {
      requestId,
      rateLimit: locals.rateLimit,
    });

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 429,
        code: "RateLimited",
        message: "Too many requests. Please retry later.",
        details: {
          limit: locals.rateLimit.limit,
          remaining: locals.rateLimit.remaining,
          reset: locals.rateLimit.reset,
          retryAfter: locals.rateLimit.retryAfter,
        },
      })
    );
  }

  if (!locals.supabase) {
    logger.error("Supabase client missing in GET /v1/user-games", { requestId });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "SupabaseUnavailable",
        message: "Database client is not configured for this request.",
      })
    );
  }

  const { data: userResult, error: authError } = await locals.supabase.auth.getUser();

  if (authError) {
    logger.warn("Auth check failed for GET /v1/user-games", {
      requestId,
      error: authError,
    });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      })
    );
  }

  if (!userResult?.user) {
    logger.warn("Unauthorized request for GET /v1/user-games", { requestId });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      })
    );
  }

  logger.info("Fetching user games", {
    requestId,
    userId: userResult.user.id,
    query,
  });

  try {
    const result = await listUserGames(userResult.user.id, query, locals.supabase);

    return applyRateLimitHeaders(createJsonResponse(result));
  } catch (error) {
    if (error instanceof UserGamesServiceError) {
      logger.error("User games fetch failed", {
        requestId,
        userId: userResult.user.id,
        query,
        details: error.details,
        cause: error.cause ?? error,
      });
      return applyRateLimitHeaders(
        createErrorResponse({
          status: 500,
          code: error.code,
          message: "Unable to fetch user games at this time.",
          details: error.details,
        })
      );
    }

    logger.error("Unexpected GET /v1/user-games failure", {
      requestId,
      userId: userResult.user.id,
      query,
      cause: error,
    });

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "BacklogFetchFailed",
        message: "Unable to fetch user games at this time.",
      })
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = locals.requestId ?? "unknown";
  const applyRateLimitHeaders = (response: Response) => withRateLimitHeaders(response, locals.rateLimit);

  let payload: CreateUserGamePayload;
  try {
    const body = await request.json();
    payload = parseCreateUserGame(body);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid user-game payload", {
        requestId,
        issues: error.issues,
      });
      return applyRateLimitHeaders(
        createErrorResponse({
          status: 400,
          code: "InvalidPayload",
          message: "Request body is invalid.",
          details: error.issues,
        })
      );
    }

    logger.error("Unexpected payload parsing error for POST /v1/user-games", {
      requestId,
      cause: error,
    });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 400,
        code: "InvalidPayload",
        message: "Request body is invalid.",
      })
    );
  }

  if (locals.rateLimit?.isRateLimited) {
    logger.warn("Rate limit exceeded for POST /v1/user-games", {
      requestId,
      rateLimit: locals.rateLimit,
    });

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 429,
        code: "RateLimited",
        message: "Too many requests. Please retry later.",
        details: {
          limit: locals.rateLimit.limit,
          remaining: locals.rateLimit.remaining,
          reset: locals.rateLimit.reset,
          retryAfter: locals.rateLimit.retryAfter,
        },
      })
    );
  }

  if (!locals.supabase) {
    logger.error("Supabase client missing in POST /v1/user-games", {
      requestId,
    });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "SupabaseUnavailable",
        message: "Database client is not configured for this request.",
      })
    );
  }

  const { data: userResult, error: authError } = await locals.supabase.auth.getUser();

  if (authError) {
    logger.warn("Auth check failed for POST /v1/user-games", {
      requestId,
      error: authError,
    });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      })
    );
  }

  if (!userResult?.user) {
    logger.warn("Unauthorized request for POST /v1/user-games", { requestId });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      })
    );
  }

  logger.info("Creating user game", {
    requestId,
    userId: userResult.user.id,
    payload,
  });

  try {
    const result = await createUserGame(
      {
        userId: userResult.user.id,
        gameId: payload.steamAppId,
        status: payload.status,
        inProgressPosition: payload.inProgressPosition,
      },
      locals.supabase
    );

    return applyRateLimitHeaders(createJsonResponse(result, { status: 201 }));
  } catch (error) {
    if (error instanceof UserGamesServiceError) {
      logger.error("User game creation failed", {
        requestId,
        userId: userResult.user.id,
        payload,
        details: error.details,
        cause: error.cause ?? error,
      });

      if (error.code === "NotFound") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 404,
            code: "NotFound",
            message: "Game not found.",
          })
        );
      }

      if (error.code === "DuplicateEntry") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 409,
            code: "DuplicateEntry",
            message: "This game is already in your backlog.",
            details: error.details,
          })
        );
      }

      return applyRateLimitHeaders(
        createErrorResponse({
          status: 500,
          code: error.code,
          message: "Unable to create user game at this time.",
          details: error.details,
        })
      );
    }

    logger.error("Unexpected POST /v1/user-games failure", {
      requestId,
      userId: userResult.user.id,
      payload,
      cause: error,
    });

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "BacklogCreateFailed",
        message: "Unable to create user game at this time.",
      })
    );
  }
};
