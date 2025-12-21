/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client.ts"
import type { RateLimitContext } from "./lib/http/rateLimit.ts"

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient
      requestId: string
      rateLimit?: RateLimitContext
      user?: {
        id: string
        email: string | null
      }
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
