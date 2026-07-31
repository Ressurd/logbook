import { describe, expect, it } from "vitest";

import { mergeTimelineEntries } from "./timeline";

describe("통합 타임라인", () => {
  it("수동 로그와 스택 이벤트를 occurredAt 기준 최신순으로 합친다", () => {
    const logs = [{ id: "log", content: "메모", createdAt: new Date(1000), updatedAt: new Date(1000), deletedAt: null, hasPendingWrites: false }];
    const events = [{ id: "event", trackerId: "t", trackerName: "휴식", eventType: "consume" as const, periodDate: "2026-07-13", chargeIndex: null, amount: -1 as const, occurredAt: new Date(500), createdAt: new Date(3000), hasPendingWrites: false }];
    const result = mergeTimelineEntries(logs, events);
    expect(result.map((entry) => entry.sourceType)).toEqual(["manual_log", "stack_event"]);
    expect(result.map((entry) => entry.key)).toEqual(["manual:log", "stack:event"]);
  });
});
