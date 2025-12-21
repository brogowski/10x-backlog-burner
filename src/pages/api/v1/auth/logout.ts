import type { APIRoute } from "astro"
import { createHash } from "node:crypto"

import { clearSessionCookies } from "../../../../lib/auth/cookies"
import { createJsonResponse } from "../../../../lib/http/responses"
import { logger } from "../../../../lib/logger"
import { AuthServiceError, logoutUser } from "../../../../lib/services/auth.service"

export const prerender = false

type ErrorCode = "auth_failed" | "supabase_unavailable" | "unknown_error"

const jsonSuccess = () =>
  createJsonResponse(
    { success: true, data: {} },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  )

const jsonError = (status: number, code: ErrorCode, message: string) =>
  createJsonResponse(
    { success: false, error: { code, message } },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  )

export const POST: APIRoute = async ({ locals }) => {
  const requestId = locals.requestId ?? "unknown"

  if (!locals.supabase) {
    logger.error("Supabase client missing in POST /v1/auth/logout", {
      requestId,
    })
    return jsonError(
      500,
      "supabase_unavailable",
      "Authentication service is unavailable.",
    )
  }

  let emailHash: string | undefined
  try {
    const { data } = await locals.supabase.auth.getUser()
    if (data.user?.email) {
      emailHash = hashEmail(data.user.email)
    }
  } catch {
    // Best-effort; logout remains idempotent.
  }

  try {
    await logoutUser(locals.supabase)
    const response = jsonSuccess()
    clearSessionCookies(response.headers)
    return response
  } catch (error) {
    if (error instanceof AuthServiceError) {
      logger.error("Auth failed during logout", {
        requestId,
        emailHash,
        code: error.code,
        details: error.details,
      })
      const response = jsonError(
        500,
        error.code === "supabase_unavailable"
          ? "supabase_unavailable"
          : "auth_failed",
        "Unable to complete logout.",
      )
      clearSessionCookies(response.headers)
      return response
    }

    logger.error("Unknown logout error", { requestId, emailHash, cause: error })
    const response = jsonError(500, "unknown_error", "Unable to complete logout.")
    clearSessionCookies(response.headers)
    return response
  }
}

const hashEmail = (email: string) =>
  createHash("sha256").update(email.toLowerCase().trim()).digest("hex")
