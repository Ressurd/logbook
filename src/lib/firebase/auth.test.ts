import { describe, expect, it } from "vitest";

import {
  isAllowedEmail,
  normalizeEmail,
  shouldFallbackToRedirect,
} from "./auth";

describe("인증 안정성", () => {
  it("허용 이메일 양쪽을 trim하고 소문자로 비교한다", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(isAllowedEmail(" USER@example.com ", " user@EXAMPLE.com ")).toBe(
      true,
    );
    expect(isAllowedEmail("other@example.com", "user@example.com")).toBe(false);
    expect(isAllowedEmail("anyone@example.com", "  ")).toBe(true);
  });

  it("popup 차단 또는 미지원 환경에서만 redirect로 대체한다", () => {
    expect(shouldFallbackToRedirect({ code: "auth/popup-blocked" })).toBe(true);
    expect(
      shouldFallbackToRedirect({
        code: "auth/operation-not-supported-in-this-environment",
      }),
    ).toBe(true);
    expect(
      shouldFallbackToRedirect({ code: "auth/popup-closed-by-user" }),
    ).toBe(false);
    expect(
      shouldFallbackToRedirect({ code: "auth/cancelled-popup-request" }),
    ).toBe(false);
    expect(shouldFallbackToRedirect({ code: "auth/network-request-failed" })).toBe(
      false,
    );
  });
});
