import type { Auth, User } from "firebase/auth";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

import { getFirebaseServices } from "./client";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const redirectFallbackCodes = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
]);

function getAuthErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

export function getKoreanAuthError(error: unknown): string {
  const code = getAuthErrorCode(error);
  const messages: Record<string, string> = {
    "auth/network-request-failed":
      "네트워크 연결을 확인한 뒤 다시 시도해주세요.",
    "auth/popup-closed-by-user": "로그인 창이 닫혔습니다. 다시 시도해주세요.",
    "auth/unauthorized-domain":
      "현재 도메인이 Firebase 인증에 등록되지 않았습니다.",
    "auth/account-exists-with-different-credential":
      "같은 이메일로 이미 다른 로그인 방식이 등록되어 있습니다.",
    "auth/too-many-requests":
      "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  };

  return (code && messages[code]) || "Google 로그인에 실패했습니다.";
}

export async function signInWithGoogle(): Promise<void> {
  const { auth } = getFirebaseServices();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export async function completeRedirectSignIn(auth: Auth): Promise<void> {
  await getRedirectResult(auth);
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getFirebaseServices().auth);
}

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function shouldFallbackToRedirect(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  return code !== null && redirectFallbackCodes.has(code);
}

export function isAllowedEmail(
  email: string | null | undefined,
  configuredEmail = process.env.NEXT_PUBLIC_ALLOWED_EMAIL,
): boolean {
  const allowedEmail = normalizeEmail(configuredEmail);
  if (!allowedEmail) return true;
  return normalizeEmail(email) === allowedEmail;
}

export function isAllowedUser(user: User): boolean {
  return isAllowedEmail(user.email);
}
