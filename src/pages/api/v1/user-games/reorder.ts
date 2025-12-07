import type { APIRoute } from "astro"
import { ZodError } from "zod"

import {
  reorderInProgress,
  UserGamesServiceError,
} from "../../../../lib/services/userGames.service.ts"
import {
  createErrorResponse,
  createJsonResponse,
} from "../../../../lib/http/responses.ts"
import { withRateLimitHeaders } from "../../../../lib/http/rateLimit.ts"
import { logger } from "../../../../lib/logger.ts"
import {
  parseReorderInProgress,
  type ReorderInProgressPayload,
} from "../../../../lib/validation/userGames.schema.ts"

export const prerender = false

export const PATCH: APIRoute = async ({ request, locals }) => {
  const requestId = locals.requestId ?? "unknown"
  const applyRateLimitHeaders = (response: Response) =>
    withRateLimitHeaders(response, locals.rateLimit)

  let payload: ReorderInProgressPayload
  try {
    const body = await request.json()
    payload = parseReorderInProgress(body)
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid reorder payload", {
        requestId,
        issues: error.issues,
      })
      return applyRateLimitHeaders(
        createErrorResponse({
          status: 400,
          code: "InvalidPayload",
          message: "Request body is invalid.",
          details: error.issues,
        }),
      )
    }

    logger.error("Unexpected payload parsing error for PATCH /v1/user-games/reorder", {
      requestId,
      cause: error,
    })
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 400,
        code: "InvalidPayload",
        message: "Request body is invalid.",
      }),
    )
  }

  if (locals.rateLimit?.isRateLimited) {
    logger.warn("Rate limit exceeded for PATCH /v1/user-games/reorder", {
      requestId,
      rateLimit: locals.rateLimit,
    })

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
      }),
    )
  }

  if (!locals.supabase) {
    logger.error("Supabase client missing in PATCH /v1/user-games/reorder", {
      requestId,
    })
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "SupabaseUnavailable",
        message: "Database client is not configured for this request.",
      }),
    )
  }

  const { data: userResult, error: authError } =
    await locals.supabase.auth.getUser()

  if (authError) {
    logger.warn("Auth check failed for PATCH /v1/user-games/reorder", {
      requestId,
      error: authError,
    })
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      }),
    )
  }

  if (!userResult?.user) {
    logger.warn("Unauthorized request for PATCH /v1/user-games/reorder", {
      requestId,
    })
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      }),
    )
  }

  logger.info("Reordering in-progress games", {
    requestId,
    userId: userResult.user.id,
    payload,
  })

  try {
    const result = await reorderInProgress(
      userResult.user.id,
      payload.items,
      locals.supabase,
    )

    return applyRateLimitHeaders(createJsonResponse(result))
  } catch (error) {
    if (error instanceof UserGamesServiceError) {
      logger.error("User games reorder failed", {
        requestId,
        userId: userResult.user.id,
        payload,
        details: error.details,
        cause: error.cause ?? error,
      })

      if (error.code === "QueueMismatch") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 409,
            code: "QueueMismatch",
            message: "Submitted items do not match current in-progress queue.",
            details: error.details,
          }),
        )
      }

      if (error.code === "DuplicatePositions") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 400,
            code: "DuplicatePositions",
            message: "Positions must be unique.",
            details: error.details,
          }),
        )
      }

      return applyRateLimitHeaders(
        createErrorResponse({
          status: 500,
          code: error.code,
          message: "Unable to reorder in-progress games at this time.",
          details: error.details,
        }),
      )
    }

    logger.error("Unexpected PATCH /v1/user-games/reorder failure", {
      requestId,
      userId: userResult.user.id,
      payload,
      cause: error,
    })

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "BacklogReorderFailed",
        message: "Unable to reorder in-progress games at this time.",
      }),
    )
  }
}

