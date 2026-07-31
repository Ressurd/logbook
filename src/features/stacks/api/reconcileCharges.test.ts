import { describe, expect, it } from "vitest";

import { getChargeEventId, planMissingChargeEvents } from "./reconcileCharges";
import type { StackTracker } from "../model/stack.types";

function tracker(overrides: Partial<StackTracker> = {}): StackTracker {
  return {
    id: "rest",
    name: "휴식",
    scheduleMode: "all_day",
    startMinute: 0,
    endMinute: 1440,
    totalCharges: 24,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    hasPendingWrites: false,
    ...overrides,
  };
}

describe("누락 충전 이벤트 보정", () => {
  it("현재 시각까지 필요한 결정적 ID만 만든다", () => {
    const now = new Date("2026-07-12T17:30:00.000Z");
    const planned = planMissingChargeEvents([tracker()], new Set(), now);
    expect(planned.map((event) => event.id)).toEqual([
      "rest_charge_2026-07-13_1",
      "rest_charge_2026-07-13_2",
    ]);
    expect(planned[0].occurredAt.toISOString()).toBe("2026-07-12T16:00:00.000Z");
  });

  it("이미 존재하는 ID와 비활성 트래커를 건너뛰어 재실행이 멱등적이다", () => {
    const existing = new Set([getChargeEventId("rest", "2026-07-13", 1)]);
    expect(planMissingChargeEvents([tracker()], existing, new Date("2026-07-12T16:30:00.000Z"))).toEqual([]);
    expect(planMissingChargeEvents([tracker({ isActive: false })], new Set(), new Date("2026-07-13T14:00:00.000Z"))).toEqual([]);
  });

  it("과거 여러 날을 보정하지 않고 현재 KST 날짜 이벤트만 계획한다", () => {
    const planned = planMissingChargeEvents([tracker()], new Set(), new Date("2026-08-01T00:00:00.000Z"));
    expect(planned.every((event) => event.periodDate === "2026-08-01")).toBe(true);
  });
});

