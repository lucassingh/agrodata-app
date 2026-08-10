export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

export class AppError extends Error {
  code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function badRequest(message: string): never {
  throw new AppError("BAD_REQUEST", message);
}

export function unauthorized(message: string): never {
  throw new AppError("UNAUTHORIZED", message);
}

export function forbidden(message: string): never {
  throw new AppError("FORBIDDEN", message);
}

export function notFound(message: string): never {
  throw new AppError("NOT_FOUND", message);
}

export function conflict(message: string): never {
  throw new AppError("CONFLICT", message);
}
