import type { APIRoute } from "astro"
import { ZodError } from "zod"

import {
  CatalogServiceError,
  type GamesSearchFilters,
  searchGames,
} from "../../../lib/services/games/catalog.service.ts"
import {
  createErrorResponse,
  createJsonResponse,
} from "../../../lib/http/responses.ts"
import { withRateLimitHeaders } from "../../../lib/http/rateLimit.ts"
import { logger } from "../../../lib/logger.ts"
import { parseGamesSearchParams } from "../../../lib/validation/gamesSearch.schema.ts"

export const prerender = false

export const GET: APIRoute = async ({ url, locals }) => {
  const requestId = locals.requestId ?? "unknown"
  const applyRateLimitHeaders = (response: Response) =>
    withRateLimitHeaders(response, locals.rateLimit)

  let filters: GamesSearchFilters
  try {
    filters = parseGamesSearchParams(url.searchParams)
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid catalog filters", {
        requestId,
        issues: error.issues,
      })
      return createErrorResponse({
        status: 400,
        code: "InvalidFilter",
        message: "One or more filters are invalid.",
        details: error.issues,
      })
    }
    throw error
  }

  if (locals.rateLimit?.isRateLimited) {
    logger.warn("Rate limit exceeded for GET /v1/games", {
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
    logger.error("Supabase client missing in GET /v1/games", { requestId })
    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "SupabaseUnavailable",
        message: "Database client is not configured for this request.",
      }),
    )
  }

  logger.info("Fetching games catalog", { requestId, filters })

  try {
    const result = await searchGames(filters, locals.supabase)
    return applyRateLimitHeaders(
      createJsonResponse(result, {
        headers: {
          "cache-control": "public, max-age=60",
        },
      }),
    )
  } catch (error) {
    if (error instanceof CatalogServiceError) {
      logger.error("Catalog query failed", {
        requestId,
        filters,
        details: error.details,
        cause: error.cause ?? error,
      })
      return applyRateLimitHeaders(
        createErrorResponse({
          status: 500,
          code: error.code,
          message: "Unable to fetch games at this time.",
          details: error.details,
        }),
      )
    }

    logger.error("Unexpected GET /v1/games failure", {
      requestId,
      filters,
      cause: error,
    })

    return applyRateLimitHeaders(
      createErrorResponse({
        status: 500,
        code: "CatalogQueryFailed",
        message: "Unable to fetch games at this time.",
      }),
    )
  }
}

