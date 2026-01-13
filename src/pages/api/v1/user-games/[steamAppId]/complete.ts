import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { completeUserGame, UserGamesServiceError } from "../../../../../lib/services/userGames.service.ts";
import { createErrorResponse, createJsonResponse } from "../../../../../lib/http/responses.ts";
import { withRateLimitHeaders } from "../../../../../lib/http/rateLimit.ts";
import { logger } from "../../../../../lib/logger.ts";
import {
  parseCompleteUserGame,
  parseSteamAppIdParam,
  type CompleteUserGamePayload,
} from "../../../../../lib/validation/userGames.schema.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  const requestId = locals.requestId ?? "unknown";
  const applyRateLimitHeaders = (response: Response) => withRateLimitHeaders(response, locals.rateLimit);

  let steamAppId: number;
  try {
    steamAppId = parseSteamAppIdParam(params.steamAppId);
  } catch (error) {
    const details = error instanceof ZodError ? error.issues : undefined;
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 400,
        code: "InvalidPayload",
        message: "Invalid steamAppId parameter.",
        details,
      })
    );
  }

  let payload: CompleteUserGamePayload;
  try {
    const body = await request.json().catch(() => ({}));
    payload = parseCompleteUserGame(body);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid user-game completion payload", {
        requestId,
        steamAppId,
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

    logger.error("Unexpected payload parsing error for POST /v1/user-games/:steamAppId/complete", {
      requestId,
      steamAppId,
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
    logger.warn("Rate limit exceeded for POST /v1/user-games/:steamAppId/complete", {
      requestId,
      steamAppId,
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
    logger.error("Supabase client missing in POST /v1/user-games/:steamAppId/complete", {
      requestId,
      steamAppId,
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
    logger.warn("Auth check failed for POST /v1/user-games/:steamAppId/complete", {
      requestId,
      steamAppId,
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
    logger.warn("Unauthorized request for POST /v1/user-games/:steamAppId/complete", {
      requestId,
      steamAppId,
    });
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      })
    );
  }

  logger.info("Completing user game", {
    requestId,
    userId: userResult.user.id,
    steamAppId,
    payload,
  });

  try {
    const result = await completeUserGame(userResult.user.id, steamAppId, payload, locals.supabase);

    return applyRateLimitHeaders(createJsonResponse(result));
  } catch (error) {
    if (error instanceof UserGamesServiceError) {
      logger.error("User game completion failed", {
        requestId,
        userId: userResult.user.id,
        steamAppId,
        payload,
        details: error.details,
        cause: error.cause ?? error,
      });

      if (error.code === "EntryNotFound") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 404,
            code: "EntryNotFound",
            message: "User game not found.",
          })
        );
      }

      if (error.code === "InvalidStatusTransition") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 422,
            code: "InvalidStatusTransition",
            message: "Invalid status transition.",
            details: error.details,
          })
        );
      }

      return applyRateLimitHeaders(
        createErrorResponse({
          status: 500,
          code: "CompletionFailed",
          message: "Unable to complete user game at this time.",
          details: error.details,
        })
      );
    }

    logger.error("Unexpected POST /v1/user-games/:steamAppId/complete failure", {
      requestId,
      userId: userResult.user.id,
      steamAppId,
      payload,
      cause: error,
    });

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "CompletionFailed",
        message: "Unable to complete user game at this time.",
      })
    );
  }
};
