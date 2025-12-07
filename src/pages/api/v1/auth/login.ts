import type { APIRoute } from "astro"
import { createHash } from "node:crypto"
import type { Session } from "@supabase/supabase-js"
import { ZodError } from "zod"

import { createJsonResponse } from "../../../../lib/http/responses.ts"
import { logger } from "../../../../lib/logger.ts"
import {
  parseLoginPayload,
  type LoginPayload,
} from "../../../../lib/validation/auth.ts"

export const prerender = false

const ACCESS_TOKEN_COOKIE = "sb-access-token"
const REFRESH_TOKEN_COOKIE = "sb-refresh-token"
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

type ErrorCode =
  | "validation_error"
  | "invalid_credentials"
  | "auth_failed"
  | "supabase_unavailable"

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
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  )

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = locals.requestId ?? "unknown"

  if (!locals.supabase) {
    logger.error("Supabase client missing in POST /v1/auth/login", {
      requestId,
    })
    return jsonError(
      500,
      "supabase_unavailable",
      "Authentication service is unavailable.",
    )
  }

  let payload: LoginPayload
  try {
    const body = await request.json()
    payload = parseLoginPayload(body)
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid login payload", {
        requestId,
        issues: error.issues,
      })
      const message =
        error.issues[0]?.message ?? "Email and password are required."
      return jsonError(400, "validation_error", message, error.issues)
    }

    logger.error("Unexpected login payload parsing error", {
      requestId,
      cause: error,
    })
    return jsonError(
      400,
      "validation_error",
      "Email and password are required.",
    )
  }

  const emailHash = hashEmail(payload.email)

  try {
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    })

    if (error) {
      if (error.code === "invalid_credentials") {
        logger.warn("Invalid credentials in POST /v1/auth/login", {
          requestId,
          emailHash,
        })
        return jsonError(
          401,
          "invalid_credentials",
          "Invalid email or password.",
        )
      }

      logger.error("Supabase auth error in POST /v1/auth/login", {
        requestId,
        emailHash,
        code: error.code,
        message: error.message,
        status: error.status,
      })
      return jsonError(500, "auth_failed", "Unable to complete login request.")
    }

    if (!data.user || !data.session) {
      logger.error("Login succeeded without session or user", {
        requestId,
        emailHash,
      })
      return jsonError(500, "auth_failed", "Unable to complete login request.")
    }

    const response = jsonSuccess({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })

    appendSessionCookies(response.headers, data.session)
    return response
  } catch (error) {
    logger.error("Unexpected login failure", {
      requestId,
      emailHash,
      cause: error,
    })
    return jsonError(500, "auth_failed", "Unable to complete login request.")
  }
}

const appendSessionCookies = (headers: Headers, session: Session) => {
  const accessExpiresAt =
    session.expires_at !== undefined
      ? new Date(session.expires_at * 1000)
      : undefined

  setCookie(headers, ACCESS_TOKEN_COOKIE, session.access_token, {
    path: "/",
    sameSite: "Lax",
    secure: true,
    httpOnly: true,
    expires: accessExpiresAt,
  })

  setCookie(headers, REFRESH_TOKEN_COOKIE, session.refresh_token, {
    path: "/",
    sameSite: "Lax",
    secure: true,
    httpOnly: true,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  })
}

type CookieOptions = {
  path?: string
  domain?: string
  maxAge?: number
  expires?: Date
  sameSite?: "Lax" | "Strict" | "None"
  secure?: boolean
  httpOnly?: boolean
}

const setCookie = (
  headers: Headers,
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  parts.push(`Path=${options.path ?? "/"}`)

  if (options.domain) {
    parts.push(`Domain=${options.domain}`)
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }

  parts.push(`SameSite=${options.sameSite ?? "Lax"}`)

  if (options.secure ?? true) {
    parts.push("Secure")
  }

  if (options.httpOnly ?? true) {
    parts.push("HttpOnly")
  }

  headers.append("set-cookie", parts.join("; "))
}

const hashEmail = (email: string) =>
  createHash("sha256").update(email.toLowerCase().trim()).digest("hex")

