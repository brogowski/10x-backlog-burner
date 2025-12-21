import { randomUUID } from "node:crypto"

import { defineMiddleware } from "astro:middleware"

import { supabaseClient } from "../db/supabase.client.ts"
import { readSessionCookies } from "../lib/auth/cookies.ts"
import type { AuthUserDTO } from "../types"

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = randomUUID()
  context.locals.supabase = supabaseClient

  const { accessToken } = readSessionCookies(context.request.headers.get("cookie"))
  if (accessToken) {
    try {
      const { data, error } = await supabaseClient.auth.getUser(accessToken)
      if (!error && data.user) {
        const user: AuthUserDTO = {
          id: data.user.id,
          email: data.user.email ?? null,
        }
        context.locals.user = user
      }
    } catch {
      // Best-effort hydration of user; failures should not block the request.
    }
  }

  return next()
})

