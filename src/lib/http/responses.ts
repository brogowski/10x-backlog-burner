export type ApiErrorCode =
  | "InvalidFilter"
  | "InvalidQuery"
  | "InvalidPayload"
  | "Unauthorized"
  | "NotFound"
  | "DuplicateEntry"
  | "QueueMismatch"
  | "DuplicatePositions"
  | "BacklogFetchFailed"
  | "BacklogCreateFailed"
  | "BacklogReorderFailed"
  | "CatalogQueryFailed"
  | "SupabaseUnavailable"
  | "RateLimited"

type JsonResponseOptions = {
  status?: number
  headers?: HeadersInit
}

type ErrorResponseOptions = {
  status: number
  code: ApiErrorCode
  message: string
  details?: unknown
  headers?: HeadersInit
}

const DEFAULT_JSON_HEADERS = {
  "content-type": "application/json",
}

export const createJsonResponse = (
  payload: unknown,
  options: JsonResponseOptions = {},
) => {
  const headers = new Headers({
    ...DEFAULT_JSON_HEADERS,
    ...(options.headers ?? {}),
  })

  return new Response(JSON.stringify(payload), {
    status: options.status ?? 200,
    headers,
  })
}

export const createErrorResponse = ({
  status,
  code,
  message,
  details,
  headers,
}: ErrorResponseOptions) =>
  createJsonResponse(
    {
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
        ...headers,
      },
    },
  )

