import { describe, expect, it } from "vitest";

import { createStackJsonBackup } from "./export";

describe("스택 JSON 백업", () => {
  it("트래커와 이벤트, 시간대, ISO 시각을 모두 포함한다", () => {
    const at = new Date("2026-07-13T00:00:00.000Z");
    const backup = JSON.parse(createStackJsonBackup({
      trackers: [{ id: "t", name: "휴식", scheduleMode: "all_day", startMinute: 0, endMinute: 1440, totalCharges: 24, intervalDays: null, anchorDate: null, sortOrder: 10, isActive: true, createdAt: at, updatedAt: at }],
      events: [{ id: "e", trackerId: "t", trackerName: "휴식", eventType: "charge", periodDate: "2026-07-13", chargeIndex: 1, amount: 1, occurredAt: at, createdAt: at }],
    }, at));
    expect(backup.timezone).toBe("Asia/Seoul");
    expect(backup.trackers).toHaveLength(1);
    expect(backup.trackers[0].sortOrder).toBe(10);
    expect(backup.events[0].occurredAt).toBe(at.toISOString());
  });
});
