/**
 * Application error taxonomy.
 *
 * Services throw these; the UI layer converts them to user-friendly messages.
 * Internal details (stack traces, Prisma errors) are never shown to users.
 */

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Field-level validation errors (used by forms). */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: ErrorCode, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input.", fieldErrors?: Record<string, string[]>) {
    super("VALIDATION", message, fieldErrors);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in.") {
    super("UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super("NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "This operation conflicts with existing data.") {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

export class BusinessError extends AppError {
  constructor(message: string) {
    super("BUSINESS", message);
    this.name = "BusinessError";
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many attempts. Please try again later.") {
    super("RATE_LIMITED", message);
    this.name = "RateLimitedError";
  }
}

/** Map any thrown value to a safe, user-presentable message. */
export function getUserSafeMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    // Never leak internals for unexpected errors.
    console.error("[unhandled error]", error);
    return "Something went wrong. Please try again or contact support.";
  }
  return "Something went wrong. Please try again.";
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
