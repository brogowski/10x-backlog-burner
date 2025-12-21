import type { Session } from "@supabase/supabase-js"

export const ACCESS_TOKEN_COOKIE = "sb-access-token"
export const REFRESH_TOKEN_COOKIE = "sb-refresh-token"
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

type CookieOptions = {
  path?: string
  domain?: string
  maxAge?: number
  expires?: Date
  sameSite?: "Lax" | "Strict" | "None"
  secure?: boolean
  httpOnly?: boolean
}

export const setCookie = (
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

export const appendSessionCookies = (headers: Headers, session: Session) => {
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

export const clearSessionCookies = (headers: Headers) => {
  const expired = new Date(0)

  setCookie(headers, ACCESS_TOKEN_COOKIE, "", {
    path: "/",
    sameSite: "Lax",
    secure: true,
    httpOnly: true,
    expires: expired,
  })

  setCookie(headers, REFRESH_TOKEN_COOKIE, "", {
    path: "/",
    sameSite: "Lax",
    secure: true,
    httpOnly: true,
    expires: expired,
  })
}
