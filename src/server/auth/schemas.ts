import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is required.")
      .max(100, "Full name is too long."),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(20, "Username must be at most 20 characters.")
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores."),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .min(6, "Enter a valid phone number.")
      .max(20, "Phone number is too long."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password is too long.")
      .regex(/[a-zA-Z]/, "Password must contain a letter.")
      .regex(/[0-9]/, "Password must contain a number."),
    confirmPassword: z.string(),
    referralCode: z
      .string()
      .trim()
      .max(30)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    acceptTerms: z.literal(true, {
      error: "You must accept the Terms & Conditions.",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password is too long.")
      .regex(/[a-zA-Z]/, "Password must contain a letter.")
      .regex(/[0-9]/, "Password must contain a number."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Flatten Zod issues into a Record<field, string[]> for form display. */
export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = (issue.path[0] ?? "form").toString();
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
