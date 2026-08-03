import { describe, expect, it } from "vitest";

import {
  calculateChargeSchedule,
  calculateChargedCount,
  calculateCurrentStack,
  calculateDailyCumulativeChargedCount,
  calculateDailyCumulativeCurrentStack,
  formatChargeInterval,
  formatRemainingDuration,
  calculateIntervalChargedCount,
  calculateIntervalCurrentStack,
  getIntervalChargeAt,
  getNextIntervalChargeAt,
  getKstPeriodDate,
  getKstPeriodRange,
  getNextChargeAt,
  getNextDailyChargeAt,
  timeToMinute,
} from "./stackCalculations";

const allDay = { startMinute: 0, endMinute: 1440, totalCharges: 24 };

describe("스택 시간 계산", () => {
  it("20시간/10회는 2시간, 10시간/6회는 1시간 40분 간격이다", () => {
    expect(formatChargeInterval({ startMinute: 240, endMinute: 1440, totalCharges: 10 })).toBe("2시간");
    expect(formatChargeInterval({ startMinute: 600, endMinute: 1200, totalCharges: 6 })).toBe("1시간 40분");
  });

  it("KST 하루 전체를 같은 간격으로 나누고 마지막 충전을 정확히 자정에 둔다", () => {
    const schedule = calculateChargeSchedule(allDay, "2026-07-13");
    expect(schedule).toHaveLength(24);
    expect(schedule[0].toISOString()).toBe("2026-07-12T16:00:00.000Z");
    expect(schedule.at(-1)?.toISOString()).toBe("2026-07-13T15:00:00.000Z");
  });

  it("04:00~24:00 140회를 계산하고 소수 간격에서도 마지막 시각을 고정한다", () => {
    const tracker = { startMinute: 240, endMinute: 1440, totalCharges: 140 };
    const schedule = calculateChargeSchedule(tracker, "2026-07-13");
    expect(schedule).toHaveLength(140);
    expect(schedule.at(-1)?.toISOString()).toBe("2026-07-13T15:00:00.000Z");
    expect(formatChargeInterval(tracker)).toBe("8분 34초");
  });

  it("첫 충전 직전/정각과 종료 경계를 포함해 충전 수를 계산한다", () => {
    expect(calculateChargedCount(allDay, "2026-07-13", new Date("2026-07-12T15:00:00.000Z"))).toBe(0);
    expect(calculateChargedCount(allDay, "2026-07-13", new Date("2026-07-12T15:59:59.999Z"))).toBe(0);
    expect(calculateChargedCount(allDay, "2026-07-13", new Date("2026-07-12T16:00:00.000Z"))).toBe(1);
    expect(calculateChargedCount(allDay, "2026-07-13", new Date("2026-07-13T15:00:00.000Z"))).toBe(24);
    expect(calculateChargedCount(allDay, "2026-07-13", new Date("2026-07-14T00:00:00.000Z"))).toBe(24);
  });

  it("사용 횟수가 충전보다 많으면 음수 스택을 허용한다", () => {
    expect(calculateCurrentStack(allDay, "2026-07-13", 3, new Date("2026-07-12T16:00:00.000Z"))).toBe(-2);
  });

  it("시간표 스택도 생성 이후 날짜가 바뀌어도 계속 누적한다", () => {
    const tracker = {
      ...allDay,
      createdAt: new Date("2026-07-12T15:30:00.000Z"),
    };
    expect(calculateDailyCumulativeChargedCount(tracker, new Date("2026-07-12T16:00:00.000Z"))).toBe(1);
    expect(calculateDailyCumulativeChargedCount(tracker, new Date("2026-07-13T15:00:00.000Z"))).toBe(24);
    expect(calculateDailyCumulativeChargedCount(tracker, new Date("2026-07-13T16:00:00.000Z"))).toBe(25);
    expect(calculateDailyCumulativeCurrentStack(tracker, 3, new Date("2026-07-13T16:00:00.000Z"))).toBe(22);
  });

  it("시간표 누적 계산은 월말과 윤년을 지나도 하루 충전을 유지한다", () => {
    const tracker = {
      startMinute: 0,
      endMinute: 1440,
      totalCharges: 1,
      createdAt: new Date("2024-02-27T15:00:00.000Z"),
    };
    expect(calculateDailyCumulativeChargedCount(tracker, new Date("2024-02-29T15:00:00.000Z"))).toBe(2);
  });

  it("다음 충전과 남은 시간을 반환하고 완료 뒤에는 null을 반환한다", () => {
    const now = new Date("2026-07-12T15:30:00.000Z");
    const next = getNextChargeAt(allDay, "2026-07-13", now);
    expect(next?.toISOString()).toBe("2026-07-12T16:00:00.000Z");
    expect(formatRemainingDuration(next, now)).toBe("30분");
    expect(getNextChargeAt(allDay, "2026-07-13", new Date("2026-07-13T15:00:00.000Z"))).toBeNull();
  });

  it("오늘 시간표가 끝나면 다음 날 첫 충전 시각을 반환한다", () => {
    const tracker = { startMinute: 600, endMinute: 1200, totalCharges: 2 };
    const now = new Date("2026-07-13T12:00:00.000Z");
    expect(getNextDailyChargeAt(tracker, now).toISOString()).toBe("2026-07-14T06:00:00.000Z");
  });

  it("KST 자정에 periodDate를 바꾸고 월말·연말·윤년 범위를 처리한다", () => {
    expect(getKstPeriodDate(new Date("2026-07-31T14:59:59.999Z"))).toBe("2026-07-31");
    expect(getKstPeriodDate(new Date("2026-07-31T15:00:00.000Z"))).toBe("2026-08-01");
    expect(getKstPeriodRange("2024-02-29").end.toISOString()).toBe("2024-02-29T15:00:00.000Z");
    expect(getKstPeriodRange("2026-12-31").end.toISOString()).toBe("2026-12-31T15:00:00.000Z");
  });

  it("24:00은 종료에만 허용하고 잘못된 시각을 거부한다", () => {
    expect(timeToMinute("24:00", true)).toBe(1440);
    expect(timeToMinute("24:00")).toBeNull();
    expect(timeToMinute("23:59")).toBe(1439);
    expect(timeToMinute("12:60")).toBeNull();
    expect(() => getKstPeriodRange("2026-07-13", 600, 500)).toThrow("올바르지 않습니다");
    expect(() => calculateChargeSchedule({ startMinute: 0, endMinute: 1440, totalCharges: 201 }, "2026-07-13")).toThrow("1~200");
  });

  it("만든 시각부터 4일이 지날 때마다 계속 누적한다", () => {
    const tracker = { createdAt: new Date("2026-07-01T03:12:34.000Z"), intervalDays: 4 };
    expect(getIntervalChargeAt(tracker, 1).toISOString()).toBe("2026-07-05T03:12:34.000Z");
    expect(getIntervalChargeAt(tracker, 2).toISOString()).toBe("2026-07-09T03:12:34.000Z");
    expect(calculateIntervalChargedCount(tracker, new Date("2026-07-13T03:12:33.999Z"))).toBe(2);
    expect(calculateIntervalChargedCount(tracker, new Date("2026-07-13T03:12:34.000Z"))).toBe(3);
  });

  it("주기형 스택은 사용하지 않으면 누적되고 사용량을 전체 누적에서 차감한다", () => {
    const tracker = { createdAt: new Date("2026-07-01T15:00:00.000Z"), intervalDays: 7 };
    const now = new Date("2026-07-29T15:00:00.000Z");
    expect(calculateIntervalChargedCount(tracker, now)).toBe(4);
    expect(calculateIntervalCurrentStack(tracker, 1, now)).toBe(3);
    expect(calculateIntervalCurrentStack(tracker, 5, now)).toBe(-1);
    expect(getNextIntervalChargeAt(tracker, now).toISOString()).toBe("2026-08-05T15:00:00.000Z");
  });

  it("생성 직후에는 0이고 첫 주기가 지난 정각부터 1이다", () => {
    const tracker = { createdAt: new Date("2026-07-31T01:00:00.000Z"), intervalDays: 4 };
    expect(calculateIntervalChargedCount(tracker, new Date("2026-08-04T00:59:59.999Z"))).toBe(0);
    expect(calculateIntervalChargedCount(tracker, new Date("2026-08-04T01:00:00.000Z"))).toBe(1);
  });

  it("누적 횟수에는 최대치가 없다", () => {
    const tracker = { createdAt: new Date("2020-01-01T00:00:00.000Z"), intervalDays: 1 };
    expect(calculateIntervalChargedCount(tracker, new Date("2022-09-27T00:00:00.000Z"))).toBe(1_000);
  });
});
