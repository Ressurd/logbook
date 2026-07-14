export const MOBILE_ENTER_MODE_STORAGE_KEY = "logbook:mobile-enter-mode";

export type MobileEnterMode = "submit" | "newline";

export function parseMobileEnterMode(value: string | null): MobileEnterMode {
  return value === "submit" ? "submit" : "newline";
}
