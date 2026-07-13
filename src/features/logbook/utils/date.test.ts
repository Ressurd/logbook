import { describe, expect, it } from "vitest";

import {
  addDaysToDateString,
  formatKstTime,
  getKstDayRange,
  getTodayKstDateString,
  isFutureKstDate,
} from "./date";

describe("KST 날짜 유틸리티", () => {
  it("한국 시간 자정 경계를 UTC 범위로 변환한다", () => {
    const range = getKstDayRange("2026-07-13");
    expect(range.start.toISOString()).toBe("2026-07-12T15:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-13T15:00:00.000Z");
  });

  it("23:59:59는 같은 KST 날짜 범위 안이고 다음 자정은 제외한다", () => {
    const range = getKstDayRange("2026-07-13");
    const lastSecond = new Date("2026-07-13T14:59:59.000Z");
    expect(lastSecond.getTime()).toBeGreaterThanOrEqual(range.start.getTime());
    expect(lastSecond.getTime()).toBeLessThan(range.end.getTime());
    expect(new Date("2026-07-13T15:00:00.000Z").getTime()).toBe(
      range.end.getTime(),
    );
  });

  it("UTC 날짜와 다른 한국 날짜를 반환한다", () => {
    expect(getTodayKstDateString(new Date("2026-07-12T15:00:00.000Z"))).toBe(
      "2026-07-13",
    );
  });

  it("이전 날짜와 다음 날짜를 이동한다", () => {
    expect(addDaysToDateString("2026-07-13", -1)).toBe("2026-07-12");
    expect(addDaysToDateString("2026-07-13", 1)).toBe("2026-07-14");
  });

  it("월말, 연말, 윤년 2월 29일의 다음 날짜를 계산한다", () => {
    expect(addDaysToDateString("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysToDateString("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateString("2028-02-29", 1)).toBe("2028-03-01");
    expect(getKstDayRange("2028-02-29").start.toISOString()).toBe(
      "2028-02-28T15:00:00.000Z",
    );
  });

  it("한국 기준 미래 날짜를 판정한다", () => {
    const now = new Date("2026-07-13T05:00:00.000Z");
    expect(isFutureKstDate("2026-07-14", now)).toBe(true);
    expect(isFutureKstDate("2026-07-13", now)).toBe(false);
  });

  it("시간을 초 단위로 표시한다", () => {
    expect(formatKstTime(new Date("2026-07-13T05:23:17.000Z"))).toBe(
      "14:23:17",
    );
  });
});
