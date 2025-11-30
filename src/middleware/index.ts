import { randomUUID } from "node:crypto"

import { defineMiddleware } from "astro:middleware"

import { supabaseClient } from "../db/supabase.client.ts"

export const onRequest = defineMiddleware((context, next) => {
  context.locals.requestId = randomUUID()
  context.locals.supabase = supabaseClient
  return next()
})

