import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";
import type { SupabaseClient } from "./supabase.client";

let serviceSupabaseClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client for backend-only operations (e.g., password reset).
 * Uses non-persisted sessions to avoid leaking service tokens to clients.
 */
export const getServiceSupabaseClient = (): SupabaseClient => {
  if (serviceSupabaseClient) return serviceSupabaseClient;

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role client is not configured (missing SUPABASE_URL or SUPABASE_KEY).");
  }

  serviceSupabaseClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceSupabaseClient;
};
