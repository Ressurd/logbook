import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

type Policy = {
  getRequestStrategy: (request: {
    method: string;
    mode: string;
    url: string;
  }) => string;
};

function loadPolicy(): Policy {
  const workerSelf = {
    location: { origin: "https://logbook.example" },
    clients: { claim: vi.fn() },
    skipWaiting: vi.fn(),
    addEventListener: vi.fn(),
    __LOGBOOK_SW_POLICY__: undefined as Policy | undefined,
  };
  runInNewContext(readFileSync(resolve("public/sw.js"), "utf8"), {
    self: workerSelf,
    caches: {},
    fetch: vi.fn(),
    Response,
    URL,
  });
  if (!workerSelf.__LOGBOOK_SW_POLICY__) {
    throw new Error("서비스 워커 정책을 불러오지 못했습니다.");
  }
  return workerSelf.__LOGBOOK_SW_POLICY__;
}

function request(path: string, method = "GET", mode = "cors") {
  return {
    method,
    mode,
    url: new URL(path, "https://logbook.example").toString(),
  };
}

describe("서비스 워커 캐시 정책", () => {
  const policy = loadPolicy();

  it("Next 정적 리소스와 PWA 정적 파일만 cache-first로 처리한다", () => {
    expect(
      policy.getRequestStrategy(request("/_next/static/chunks/app-123.js")),
    ).toBe("cache-first");
    expect(policy.getRequestStrategy(request("/manifest.webmanifest"))).toBe(
      "cache-first",
    );
  });

  it("HTML navigation은 네트워크 우선이며 일반 GET/RSC는 캐시하지 않는다", () => {
    expect(policy.getRequestStrategy(request("/search", "GET", "navigate"))).toBe(
      "navigation-network-first",
    );
    expect(policy.getRequestStrategy(request("/search?_rsc=abc"))).toBe(
      "network-only",
    );
  });

  it("POST와 Firebase/Google cross-origin 요청은 네트워크에 맡긴다", () => {
    expect(policy.getRequestStrategy(request("/api/write", "POST"))).toBe(
      "network-only",
    );
    expect(
      policy.getRequestStrategy({
        method: "GET",
        mode: "cors",
        url: "https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel",
      }),
    ).toBe("network-only");
    expect(
      policy.getRequestStrategy({
        method: "GET",
        mode: "cors",
        url: "https://accounts.google.com/o/oauth2/auth",
      }),
    ).toBe("network-only");
  });
});
