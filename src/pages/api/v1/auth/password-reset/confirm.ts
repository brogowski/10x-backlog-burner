import type { APIRoute } from "astro"
import { createHash } from "node:crypto"
import { ZodError } from "zod"

import { appendSessionCookies } from "../../../../../lib/auth/cookies"
import { createJsonResponse } from "../../../../../lib/http/responses"
import { logger } from "../../../../../lib/logger"
import {
  AuthServiceError,
  confirmPasswordReset,
} from "../../../../../lib/services/auth.service"
import { parseResetConfirmPayload } from "../../../../../lib/validation/auth"

export const prerender = false

type ErrorCode =
  | "validation_error"
  | "reset_invalid_or_expired"
  | "auth_failed"
  | "supabase_unavailable"
  | "unknown_error"

const jsonSuccess = (payload: unknown) =>
  createJsonResponse(
    { success: true, data: payload },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  )

const jsonError = (
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
) =>
  createJsonResponse(
    { success: false, error: { code, message, details } },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  )

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = locals.requestId ?? "unknown"

  let payload: ReturnType<typeof parseResetConfirmPayload>
  try {
    const body = await request.json()
    payload = parseResetConfirmPayload(body)
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid reset confirm payload", {
        requestId,
        issues: error.issues,
      })
      const message =
        error.issues[0]?.message ?? "Password is required for reset."
      return jsonError(400, "validation_error", message, error.issues)
    }

    logger.error("Unexpected reset confirm payload parsing error", {
      requestId,
      cause: error,
    })
    return jsonError(
      400,
      "validation_error",
      "Password is required for reset.",
    )
  }

  let serviceSupabase
  try {
    serviceSupabase = locals.supabase
  } catch (error) {
    logger.error("Service Supabase unavailable for reset confirm", {
      requestId,
      cause: error,
    })
    return jsonError(
      500,
      "supabase_unavailable",
      "Authentication service is unavailable.",
    )
  }

  try {
    const { user, session } = await confirmPasswordReset(payload, serviceSupabase)

    const emailHash = user.email ? hashEmail(user.email) : undefined
    const response = jsonSuccess({ user })
    if (!session) {
      logger.error("Password reset confirmed without session", { requestId, emailHash })
      return jsonError(500, "auth_failed", "Unable to complete password reset.")
    }
    appendSessionCookies(response.headers, session)

    logger.info("Password reset confirmed", { requestId, emailHash })
    return response
  } catch (error) {
    if (error instanceof AuthServiceError) {
      if (error.code === "reset_invalid_or_expired") {
        logger.warn("Invalid or expired reset code", { requestId })
        return jsonError(
          400,
          "reset_invalid_or_expired",
          "Reset link is invalid or expired. Request a new one.",
          error.details,
        )
      }

      const isSupabaseDown = error.code === "supabase_unavailable"
      logger.error("Auth failed during reset confirm", {
        requestId,
        code: error.code,
        details: error.details,
      })
      return jsonError(
        500,
        isSupabaseDown ? "supabase_unavailable" : "auth_failed",
        "Unable to complete password reset.",
        error.details,
      )
    }

    logger.error("Unknown reset confirm error", { requestId, cause: error })
    return jsonError(500, "unknown_error", "Unable to complete password reset.")
  }
}

const hashEmail = (email: string) =>
  createHash("sha256").update(email.toLowerCase().trim()).digest("hex")
