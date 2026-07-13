import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ko } from "date-fns/locale";

export const KST_TIME_ZONE = "Asia/Seoul";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

export function getTodayKstDateString(now = new Date()): string {
  return formatInTimeZone(now, KST_TIME_ZONE, "yyyy-MM-dd");
}

export function getKstDayRange(date: string): { start: Date; end: Date } {
  if (!isValidDateString(date)) {
    throw new Error("올바른 날짜 형식이 아닙니다.");
  }

  return {
    start: fromZonedTime(`${date}T00:00:00`, KST_TIME_ZONE),
    end: fromZonedTime(
      `${addDaysToDateString(date, 1)}T00:00:00`,
      KST_TIME_ZONE,
    ),
  };
}

export function formatKstDate(date: Date): string {
  return formatInTimeZone(date, KST_TIME_ZONE, "yyyy년 M월 d일 EEEE", {
    locale: ko,
  });
}

export function formatKstDateShort(date: Date): string {
  return formatInTimeZone(date, KST_TIME_ZONE, "yyyy.MM.dd");
}

export function formatKstTime(date: Date): string {
  return formatInTimeZone(date, KST_TIME_ZONE, "HH:mm:ss");
}

export function formatDateStringKorean(date: string): string {
  return formatKstDate(getKstDayRange(date).start);
}

export function addDaysToDateString(date: string, amount: number): string {
  if (!isValidDateString(date)) {
    throw new Error("올바른 날짜 형식이 아닙니다.");
  }
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + amount);
  return base.toISOString().slice(0, 10);
}

export function isFutureKstDate(date: string, now = new Date()): boolean {
  return date > getTodayKstDateString(now);
}

export function resolveSelectedDate(value?: string): string {
  if (!value || !isValidDateString(value) || isFutureKstDate(value)) {
    return getTodayKstDateString();
  }
  return value;
}
