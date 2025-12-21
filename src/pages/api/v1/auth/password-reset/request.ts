import type { APIRoute } from "astro"
import { createHash } from "node:crypto"
import { ZodError } from "zod"

import { createJsonResponse } from "../../../../../lib/http/responses"
import { logger } from "../../../../../lib/logger"
import { getServiceSupabaseClient } from "../../../../../db/supabase-server"
import {
  AuthServiceError,
  requestPasswordReset,
} from "../../../../../lib/services/auth.service"
import { parseResetRequestPayload } from "../../../../../lib/validation/auth"

export const prerender = false

type ErrorCode = "validation_error" | "supabase_unavailable" | "auth_failed"

const jsonSuccess = () =>
  createJsonResponse(
    {
      success: true,
      data: {
        message: "If that email exists, we've sent reset instructions.",
      },
    },
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

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = locals.requestId ?? "unknown"

  let payload: ReturnType<typeof parseResetRequestPayload>
  try {
    const body = await request.json()
    payload = parseResetRequestPayload(body)
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid reset request payload", {
        requestId,
        issues: error.issues,
      })
      const message =
        error.issues[0]?.message ?? "Email is required for password reset."
      return jsonError(400, "validation_error", message)
    }

    logger.error("Unexpected reset request payload parsing error", {
      requestId,
      cause: error,
    })
    return jsonError(
      400,
      "validation_error",
      "Email is required for password reset.",
    )
  }

  const emailHash = hashEmail(payload.email)

  let serviceSupabase
  try {
    serviceSupabase = getServiceSupabaseClient()
  } catch (error) {
    logger.error("Service Supabase unavailable for reset request", {
      requestId,
      emailHash,
      cause: error,
    })
    return jsonError(
      500,
      "supabase_unavailable",
      "Authentication service is unavailable.",
    )
  }

  try {
    await requestPasswordReset(payload, serviceSupabase)
    return jsonSuccess()
  } catch (error) {
    if (error instanceof AuthServiceError) {
      logger.warn("Password reset request encountered auth error", {
        requestId,
        emailHash,
        code: error.code,
        details: error.details,
      })
      // Maintain generic 200 response to avoid email enumeration even on auth failures.
      return jsonSuccess()
    }

    logger.error("Unknown reset request error", { requestId, emailHash, cause: error })
    return jsonError(500, "auth_failed", "Unable to process password reset request.")
  }
}

const hashEmail = (email: string) =>
  createHash("sha256").update(email.toLowerCase().trim()).digest("hex")
