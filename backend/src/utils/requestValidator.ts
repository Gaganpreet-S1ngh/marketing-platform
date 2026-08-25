import "reflect-metadata";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { ValidationError, validate } from "class-validator";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ValidationSuccess<T> = { success: true; input: T; errors: null };
export type ValidationFailure<T> = {
  success: false;
  input: T;
  errors: StructuredError[];
};
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure<T>;

export type ArrayValidationSuccess<T> = {
  success: true;
  input: T[];
  errors: null;
};
export type ArrayValidationFailure<T> = {
  success: false;
  input: T[];
  errors: { index: number; message: string; details: StructuredError[] }[];
};
export type ArrayValidationResult<T> =
  | ArrayValidationSuccess<T>
  | ArrayValidationFailure<T>;

export interface StructuredError {
  field: string;
  messages: string[];
  children?: StructuredError[];
}

// ─────────────────────────────────────────────
// Body normalizer (deep, recursive)
// ─────────────────────────────────────────────

const STRICT_NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

function normalizeValue(value: unknown): unknown {
  // Recursively normalize nested objects
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value !== null && typeof value === "object") {
    return normalizeBody(value as Record<string, unknown>);
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  // Boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;

  // Strict number — prevents " ", "", "  3  " from becoming 0
  if (trimmed !== "" && STRICT_NUMBER_RE.test(trimmed)) {
    const num = Number(trimmed);
    if (isFinite(num)) return num;
  }

  // JSON objects/arrays
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return normalizeValue(JSON.parse(trimmed)); // recurse into parsed value
    } catch {
      // not valid JSON — fall through to raw string
    }
  }

  return value;
}

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      normalized[key] = normalizeValue(body[key]);
    }
  }
  return normalized;
}

// ─────────────────────────────────────────────
// Error formatter (deep, recursive — handles nested DTOs)
// ─────────────────────────────────────────────

function formatErrors(
  errors: ValidationError[],
  parentPath = "",
): StructuredError[] {
  return errors.map((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    const messages = error.constraints ? Object.values(error.constraints) : [];

    const children =
      error.children && error.children.length > 0
        ? formatErrors(error.children, field)
        : undefined;

    return {
      field,
      messages,
      ...(children && children.length > 0 ? { children } : {}),
    };
  });
}

// ─────────────────────────────────────────────
// Core validation runner
// ─────────────────────────────────────────────

async function runValidation<T extends object>(
  type: ClassConstructor<T>,
  raw: unknown,
): Promise<{ input: T; structured: StructuredError[] | null }> {
  if (
    raw === null ||
    raw === undefined ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    throw new TypeError(`Expected a plain object, got: ${JSON.stringify(raw)}`);
  }

  const normalized = normalizeBody(raw as Record<string, unknown>);

  const input = plainToInstance(type, normalized, {
    enableImplicitConversion: true,
    excludeExtraneousValues: false,
  });

  const errors = await validate(input as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false }, // don't expose full target in errors
  });

  if (errors.length > 0) {
    return { input, structured: formatErrors(errors) };
  }

  return { input, structured: null };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Validate a single object against a DTO class.
 *
 * @example
 * const result = await RequestValidator(CreateUserDto, req.body);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.errors });
 * }
 * // result.input is fully typed and safe to use
 */
export async function RequestValidator<T extends object>(
  type: ClassConstructor<T>,
  body: unknown,
): Promise<ValidationResult<T>> {
  const { input, structured } = await runValidation(type, body);

  if (structured) {
    return { success: false, input, errors: structured };
  }

  return { success: true, input, errors: null };
}

/**
 * Validate an array of objects, each against the same DTO class.
 * Returns all per-index errors rather than stopping at the first failure.
 *
 * @example
 * const result = await ArrayRequestValidator(CreateUserDto, req.body);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.errors });
 * }
 */
export async function ArrayRequestValidator<T extends object>(
  type: ClassConstructor<T>,
  body: unknown[],
): Promise<ArrayValidationResult<T>> {
  if (!Array.isArray(body)) {
    throw new TypeError(`Expected an array, got: ${typeof body}`);
  }

  const input: T[] = [];
  const errors: ArrayValidationFailure<T>["errors"] = [];

  await Promise.all(
    body.map(async (item, index) => {
      const { input: parsed, structured } = await runValidation(type, item);
      input[index] = parsed;

      if (structured) {
        errors.push({
          index,
          message: `Validation failed at index ${index}`,
          details: structured,
        });
      }
    }),
  );

  if (errors.length > 0) {
    // Sort by index since Promise.all resolves out of order
    errors.sort((a, b) => a.index - b.index);
    return { success: false, input, errors };
  }

  return { success: true, input, errors: null };
}
