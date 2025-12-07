import { z } from "zod"

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(7, "Password must be at least 8 characters long"),
})

export type LoginPayload = z.infer<typeof loginSchema>

export const parseLoginPayload = (payload: unknown): LoginPayload =>
  loginSchema.parse(payload)

