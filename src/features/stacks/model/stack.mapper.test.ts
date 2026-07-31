import { describe, expect, it } from "vitest";

import { toCachedStackEvent } from "./stack.mapper";
import type { StackEvent } from "./stack.types";

function event(eventType: StackEvent["eventType"]): StackEvent {
  return {
    id: eventType,
    trackerId: "tracker",
    trackerName: "휴식",
    eventType,
    periodDate: "2026-07-13",
    chargeIndex: eventType === "charge" ? 1 : null,
    amount: eventType === "charge" ? 1 : -1,
    occurredAt: new Date(1000),
    createdAt: new Date(2000),
    hasPendingWrites: false,
  };
}

describe("스택 검색 문구", () => {
  it("충전과 사용 이벤트를 sourceType 및 occurredAt과 함께 변환한다", () => {
    const charge = toCachedStackEvent("user", event("charge"));
    const consume = toCachedStackEvent("user", event("consume"));
    expect(charge.content).toBe("[휴식] 스택 +1 충전");
    expect(consume.content).toBe("[휴식] 스택 1회 사용");
    expect(charge.sourceType).toBe("stack_event");
    expect(charge.occurredAt).toBe(1000);
  });
});

