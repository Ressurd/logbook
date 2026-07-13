export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function formatCharacterCount(value: string): string {
  return `${value.length.toLocaleString("ko-KR")} / 10,000`;
}
