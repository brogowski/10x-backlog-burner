import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient: SupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
