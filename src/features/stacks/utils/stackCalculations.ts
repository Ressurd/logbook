import type { StackTracker } from "../model/stack.types";
import { getKstDayRange, getTodayKstDateString } from "@/features/logbook/utils/date";

export type StackScheduleInput = Pick<
  StackTracker,
  "startMinute" | "endMinute" | "totalCharges"
>;

export function getKstPeriodDate(now = new Date()): string {
  return getTodayKstDateString(now);
}

export function getKstPeriodRange(
  periodDate: string,
  startMinute = 0,
  endMinute = 1440,
): { start: Date; end: Date } {
  if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute)) {
    throw new Error("스택 시간은 분 단위 정수여야 합니다.");
  }
  if (startMinute < 0 || startMinute > 1439 || endMinute < 1 || endMinute > 1440 || endMinute <= startMinute) {
    throw new Error("스택 시간 범위가 올바르지 않습니다.");
  }
  const day = getKstDayRange(periodDate);
  return {
    start: new Date(day.start.getTime() + startMinute * 60_000),
    end: new Date(day.start.getTime() + endMinute * 60_000),
  };
}

export function calculateChargeSchedule(
  tracker: StackScheduleInput,
  periodDate: string,
): Date[] {
  const { start, end } = getKstPeriodRange(
    periodDate,
    tracker.startMinute,
    tracker.endMinute,
  );
  if (!Number.isInteger(tracker.totalCharges) || tracker.totalCharges < 1 || tracker.totalCharges > 200) {
    throw new Error("충전 횟수는 1~200 사이 정수여야 합니다.");
  }
  const duration = end.getTime() - start.getTime();
  return Array.from({ length: tracker.totalCharges }, (_, offset) => {
    const index = offset + 1;
    const timestamp =
      index === tracker.totalCharges
        ? end.getTime()
        : Math.round(start.getTime() + (duration * index) / tracker.totalCharges);
    return new Date(timestamp);
  });
}

export function calculateChargedCount(
  tracker: StackScheduleInput,
  periodDate: string,
  now = new Date(),
): number {
  const nowMs = now.getTime();
  return calculateChargeSchedule(tracker, periodDate).filter(
    (scheduledAt) => scheduledAt.getTime() <= nowMs,
  ).length;
}

export function calculateCurrentStack(
  tracker: StackScheduleInput,
  periodDate: string,
  consumedCount: number,
  now = new Date(),
): number {
  return calculateChargedCount(tracker, periodDate, now) - consumedCount;
}

export function getNextChargeAt(
  tracker: StackScheduleInput,
  periodDate: string,
  now = new Date(),
): Date | null {
  const nowMs = now.getTime();
  return (
    calculateChargeSchedule(tracker, periodDate).find(
      (scheduledAt) => scheduledAt.getTime() > nowMs,
    ) ?? null
  );
}

export function formatChargeInterval(tracker: StackScheduleInput): string {
  const durationSeconds =
    ((tracker.endMinute - tracker.startMinute) * 60) / tracker.totalCharges;
  const rounded = Math.max(1, Math.round(durationSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  return [
    hours ? `${hours}시간` : "",
    minutes ? `${minutes}분` : "",
    seconds ? `${seconds}초` : "",
  ].filter(Boolean).join(" ");
}

export function formatRemainingDuration(target: Date | null, now = new Date()): string {
  if (!target) return "오늘 충전 완료";
  const remainingSeconds = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000));
  if (remainingSeconds === 0) return "곧 충전";
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return [
    hours ? `${hours}시간` : "",
    minutes ? `${minutes}분` : "",
    !hours && seconds ? `${seconds}초` : "",
  ].filter(Boolean).join(" ");
}

export function minuteToTime(minute: number): string {
  if (minute === 1440) return "24:00";
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeToMinute(value: string, allowEndOfDay = false): number | null {
  if (allowEndOfDay && value === "24:00") return 1440;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}
