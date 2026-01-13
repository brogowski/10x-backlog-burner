import { z } from "zod";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().min(8, "Password must be at least 8 characters long");

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const resetRequestSchema = z.object({
  email: emailSchema,
});

const resetConfirmSchema = z
  .object({
    accessToken: z.string().min(1, "Reset link is invalid or expired."),
    refreshToken: z.string().min(1, "Reset link is invalid or expired."),
    password: passwordSchema,
    type: z.string().optional(),
  })
  .refine((payload) => !payload.type || payload.type === "recovery", "Reset link is invalid or expired.");

export type LoginPayload = z.infer<typeof loginSchema>;
export type SignupPayload = z.infer<typeof signupSchema>;
export type ResetRequestPayload = z.infer<typeof resetRequestSchema>;
export type ResetConfirmPayload = z.infer<typeof resetConfirmSchema>;

export const parseLoginPayload = (payload: unknown): LoginPayload => loginSchema.parse(payload);

export const parseSignupPayload = (payload: unknown): SignupPayload => signupSchema.parse(payload);

export const parseResetRequestPayload = (payload: unknown): ResetRequestPayload => resetRequestSchema.parse(payload);

export const parseResetConfirmPayload = (payload: unknown): ResetConfirmPayload => resetConfirmSchema.parse(payload);
