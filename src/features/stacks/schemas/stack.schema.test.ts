import { describe, expect, it } from "vitest";

import { stackTrackerInputSchema } from "./stack.schema";

describe("스택 트래커 입력 검증", () => {
  it("4일마다 누적하는 설정을 허용한다", () => {
    expect(stackTrackerInputSchema.parse({
      name: "청소",
      scheduleMode: "interval_days",
      startMinute: 540,
      endMinute: 541,
      totalCharges: 1,
      intervalDays: 4,
      anchorDate: "2026-08-01",
    }).intervalDays).toBe(4);
  });

  it("주기 범위와 첫 충전 날짜를 검증한다", () => {
    const base = {
      name: "청소",
      scheduleMode: "interval_days",
      startMinute: 540,
      endMinute: 541,
      totalCharges: 1,
      intervalDays: 4,
      anchorDate: "2026-08-01",
    } as const;
    expect(stackTrackerInputSchema.safeParse({ ...base, intervalDays: 0 }).success).toBe(false);
    expect(stackTrackerInputSchema.safeParse({ ...base, intervalDays: 366 }).success).toBe(false);
    expect(stackTrackerInputSchema.safeParse({ ...base, anchorDate: "2026-02-30" }).success).toBe(false);
  });

  it("매일 방식에는 주기형 필드를 허용하지 않는다", () => {
    expect(stackTrackerInputSchema.safeParse({
      name: "휴식",
      scheduleMode: "all_day",
      startMinute: 0,
      endMinute: 1440,
      totalCharges: 24,
      intervalDays: 4,
      anchorDate: "2026-08-01",
    }).success).toBe(false);
  });
});

