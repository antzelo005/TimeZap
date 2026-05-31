export interface ApiErrorShape {
  error?: boolean;
  message?: string;
}

export interface ApiError extends Error {
  status?: number;
  data?: ApiErrorShape | null;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
