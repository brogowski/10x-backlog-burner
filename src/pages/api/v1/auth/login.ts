import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { ZodError } from "zod";

import { appendSessionCookies } from "../../../../lib/auth/cookies";
import { createJsonResponse } from "../../../../lib/http/responses";
import { logger } from "../../../../lib/logger";
import { AuthServiceError, loginUser } from "../../../../lib/services/auth.service";
import { parseLoginPayload } from "../../../../lib/validation/auth";

export const prerender = false;

type ErrorCode = "validation_error" | "invalid_credentials" | "auth_failed" | "supabase_unavailable" | "unknown_error";

const jsonSuccess = (payload: unknown, status = 200) =>
  createJsonResponse(
    { success: true, data: payload },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    }
  );

const jsonError = (status: number, code: ErrorCode, message: string, details?: unknown) =>
  createJsonResponse(
    { success: false, error: { code, message, details } },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    }
  );

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = locals.requestId ?? "unknown";

  if (!locals.supabase) {
    logger.error("Supabase client missing in POST /v1/auth/login", {
      requestId,
    });
    return jsonError(500, "supabase_unavailable", "Authentication service is unavailable.");
  }

  let payload: ReturnType<typeof parseLoginPayload>;
  try {
    const body = await request.json();
    payload = parseLoginPayload(body);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Invalid login payload", {
        requestId,
        issues: error.issues,
      });
      const message = error.issues[0]?.message ?? "Email and password are required.";
      return jsonError(400, "validation_error", message, error.issues);
    }

    logger.error("Unexpected login payload parsing error", {
      requestId,
      cause: error,
    });
    return jsonError(400, "validation_error", "Email and password are required.");
  }

  const emailHash = hashEmail(payload.email);

  try {
    const { user, session } = await loginUser(payload, locals.supabase);
    if (!session) {
      logger.error("Login returned without session", { requestId, emailHash });
      return jsonError(500, "auth_failed", "Unable to complete login request.");
    }
    const response = jsonSuccess({ user }, 201);
    appendSessionCookies(response.headers, session);
    return response;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      if (error.code === "invalid_credentials") {
        logger.warn("Invalid credentials in POST /v1/auth/login", {
          requestId,
          emailHash,
        });
        return jsonError(401, "invalid_credentials", "Invalid email or password.");
      }

      if (error.code === "supabase_unavailable") {
        logger.error("Supabase unavailable during login", {
          requestId,
          emailHash,
          details: error.details,
        });
        return jsonError(500, "supabase_unavailable", "Authentication service is unavailable.");
      }

      logger.error("Auth failed during login", {
        requestId,
        emailHash,
        code: error.code,
        details: error.details,
      });
      return jsonError(500, "auth_failed", "Unable to complete login request.", error.details);
    }

    logger.error("Unknown login error", { requestId, emailHash, cause: error });
    return jsonError(500, "unknown_error", "Unable to complete login request.");
  }
};

const hashEmail = (email: string) => createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
