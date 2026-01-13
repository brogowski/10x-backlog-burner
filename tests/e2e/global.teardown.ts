import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/db/database.types.ts";
import type { SupabaseClient } from "../../src/db/supabase.client.ts";
import test from "@playwright/test";

const log = {
  warn: (message: string) => console.warn(`[Playwright teardown] ${message}`),
  error: (message: string, error?: unknown) => console.error(`[Playwright teardown] ${message}`, error ?? ""),
  info: (message: string) => console.info(`[Playwright teardown] ${message}`),
};

const getEnvVar = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) {
    log.warn(`${key} is not configured; skipping cleanup.`);
  }
  return value;
};

interface Credentials {
  email: string;
  password: string;
}

const getE2eCredentials = (): Credentials | null => {
  const email = getEnvVar("E2E_USERNAME");
  const password = getEnvVar("E2E_PASSWORD");

  if (!email || !password) {
    log.warn("E2E credentials are not configured; skipping cleanup.");
    return null;
  }

  return { email, password };
};

const signInForCleanup = async (client: SupabaseClient, credentials: Credentials): Promise<string | null> => {
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    log.error("Failed to sign in for cleanup.", error);
    return null;
  }

  if (!data.user) {
    log.warn("Supabase returned no user after signin; skipping backlog cleanup.");
    return null;
  }

  return data.user.id;
};

const cleanUpUserGames = async (supabaseUrl: string, supabaseKey: string) => {
  const supabase: SupabaseClient = createClient<Database>(supabaseUrl, supabaseKey);

  const credentials = getE2eCredentials();
  if (!credentials) {
    return;
  }

  const userId = await signInForCleanup(supabase, credentials);
  if (!userId) {
    return;
  }

  const { data: deletedRows, error: deleteError } = await supabase
    .from("user_games")
    .delete()
    .eq("user_id", userId)
    .select("game_id");

  if (deleteError) {
    log.error("Failed to remove user_games rows.", deleteError);
    return;
  }

  log.info(`Removed ${deletedRows?.length ?? 0} backlog entries for ${userId}.`);
};

test("delete database", async ({}) => {
  const supabaseUrl = getEnvVar("SUPABASE_URL");
  const supabaseKey = getEnvVar("SUPABASE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    log.error("Failed to retrieve supabase credentials.");
    return;
  }

  await cleanUpUserGames(supabaseUrl, supabaseKey);
});
