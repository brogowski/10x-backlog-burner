import type { APIRoute } from "astro"
import { ZodError } from "zod"

import {
  updateUserGame,
  removeUserGame,
  UserGamesServiceError,
} from "../../../../lib/services/userGames.service.ts"
import {
  createErrorResponse,
  createJsonResponse,
} from "../../../../lib/http/responses.ts"
import { withRateLimitHeaders } from "../../../../lib/http/rateLimit.ts"
import { logger } from "../../../../lib/logger.ts"
import {
  parseSteamAppIdParam,
  parseUpdateUserGame,
  type UpdateUserGamePayload,
} from "../../../../lib/validation/userGames.schema.ts"

export const prerender = false

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const requestId = locals.requestId ?? "unknown"
  const applyRateLimitHeaders = (response: Response) =>
    withRateLimitHeaders(response, locals.rateLimit)

  let steamAppId: number
  try {
    steamAppId = parseSteamAppIdParam(params.steamAppId)
  } catch (error) {
    const details = error instanceof ZodError ? error.issues : undefined
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 400,
        code: "InvalidPayload",
        message: "Invalid steamAppId parameter.",
        details,
      }),
    )
  }

  let payload: UpdateUserGamePayload
  try {
    const body = await request.json()
    payload = parseUpdateUserGame(body)
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid user-game update payload", {
        requestId,
        steamAppId,
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

    logger.error("Unexpected payload parsing error for PATCH /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
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
    logger.warn("Rate limit exceeded for PATCH /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
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
    logger.error("Supabase client missing in PATCH /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
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
    logger.warn("Auth check failed for PATCH /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
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
    logger.warn("Unauthorized request for PATCH /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
    })
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      }),
    )
  }

  logger.info("Updating user game", {
    requestId,
    userId: userResult.user.id,
    steamAppId,
    payload,
  })

  try {
    const result = await updateUserGame(
      userResult.user.id,
      steamAppId,
      payload,
      locals.supabase,
    )

    return applyRateLimitHeaders(createJsonResponse(result))
  } catch (error) {
    if (error instanceof UserGamesServiceError) {
      logger.error("User game update failed", {
        requestId,
        userId: userResult.user.id,
        steamAppId,
        payload,
        details: error.details,
        cause: error.cause ?? error,
      })

      if (error.code === "EntryNotFound") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 404,
            code: "EntryNotFound",
            message: "User game not found.",
          }),
        )
      }

      if (error.code === "InProgressCapReached") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 409,
            code: "InProgressCapReached",
            message: "In-progress queue is full.",
            details: error.details,
          }),
        )
      }

      if (error.code === "InvalidStatusTransition") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 422,
            code: "InvalidStatusTransition",
            message: "Invalid status transition.",
            details: error.details,
          }),
        )
      }

      if (error.code === "PositionRequiredForInProgress") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 400,
            code: "PositionRequiredForInProgress",
            message: "inProgressPosition is required when status is in_progress.",
            details: error.details,
          }),
        )
      }

      if (error.code === "DuplicatePositions") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 400,
            code: "DuplicatePositions",
            message: "Conflicting in-progress positions.",
            details: error.details,
          }),
        )
      }

      if (error.code === "InvalidPayload") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 400,
            code: "InvalidPayload",
            message: "Request body is invalid.",
            details: error.details,
          }),
        )
      }

      return applyRateLimitHeaders(
        createErrorResponse({
          status: 500,
          code: "BacklogUpdateFailed",
          message: "Unable to update user game at this time.",
          details: error.details,
        }),
      )
    }

    logger.error("Unexpected PATCH /v1/user-games/:steamAppId failure", {
      requestId,
      userId: userResult.user.id,
      steamAppId,
      payload,
      cause: error,
    })

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "BacklogUpdateFailed",
        message: "Unable to update user game at this time.",
      }),
    )
  }
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  const requestId = locals.requestId ?? "unknown"
  const applyRateLimitHeaders = (response: Response) =>
    withRateLimitHeaders(response, locals.rateLimit)

  let steamAppId: number
  try {
    steamAppId = parseSteamAppIdParam(params.steamAppId)
  } catch (error) {
    const details = error instanceof ZodError ? error.issues : undefined
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 400,
        code: "InvalidPayload",
        message: "Invalid steamAppId parameter.",
        details,
      }),
    )
  }

  if (locals.rateLimit?.isRateLimited) {
    logger.warn("Rate limit exceeded for DELETE /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
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
    logger.error("Supabase client missing in DELETE /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
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
    logger.warn("Auth check failed for DELETE /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
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
    logger.warn("Unauthorized request for DELETE /v1/user-games/:steamAppId", {
      requestId,
      steamAppId,
    })
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 401,
        code: "Unauthorized",
        message: "You must be signed in to access this resource.",
      }),
    )
  }

  logger.info("Removing user game", {
    requestId,
    userId: userResult.user.id,
    steamAppId,
  })

  try {
    await removeUserGame(userResult.user.id, steamAppId, locals.supabase)
    return applyRateLimitHeaders(
      new Response(null, {
        status: 204,
      }),
    )
  } catch (error) {
    if (error instanceof UserGamesServiceError) {
      logger.error("User game delete failed", {
        requestId,
        userId: userResult.user.id,
        steamAppId,
        details: error.details,
        cause: error.cause ?? error,
      })

      if (error.code === "EntryNotFound") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 404,
            code: "EntryNotFound",
            message: "User game not found.",
          }),
        )
      }

      if (error.code === "DeleteNotAllowed") {
        return applyRateLimitHeaders(
          createErrorResponse({
            status: 409,
            code: "DeleteNotAllowed",
            message: "Deletion is not allowed for this entry.",
            details: error.details,
          }),
        )
      }

      return applyRateLimitHeaders(
        createErrorResponse({
          status: 500,
          code: "BacklogUpdateFailed",
          message: "Unable to delete user game at this time.",
          details: error.details,
        }),
      )
    }

    logger.error("Unexpected DELETE /v1/user-games/:steamAppId failure", {
      requestId,
      userId: userResult.user.id,
      steamAppId,
      cause: error,
    })

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "BacklogUpdateFailed",
        message: "Unable to delete user game at this time.",
      }),
    )
  }
}
