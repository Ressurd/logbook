import { describe, expect, it } from "vitest";
import { Timestamp, type DocumentSnapshot } from "firebase/firestore";

import { mapStackTrackerDocument, toCachedStackEvent } from "./stack.mapper";
import type { FirestoreStackTracker, StackEvent } from "./stack.types";

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

  it("이전 트래커에 표시 순서가 없으면 생성 시각을 기본 순서로 사용한다", () => {
    const createdAt = Timestamp.fromMillis(5_000);
    const snapshot = {
      id: "legacy",
      data: () => ({
        name: "휴식",
        scheduleMode: "all_day",
        startMinute: 0,
        endMinute: 1440,
        totalCharges: 24,
        intervalDays: null,
        anchorDate: null,
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      }),
      metadata: { hasPendingWrites: false },
    } as unknown as DocumentSnapshot<FirestoreStackTracker>;

    expect(mapStackTrackerDocument(snapshot).sortOrder).toBe(5_000);
  });
});
