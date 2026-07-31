import { z } from "zod";
import { isValidDateString } from "@/features/logbook/utils/date";

export const stackTrackerInputSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해주세요.").max(50, "이름은 50자까지 입력할 수 있습니다."),
    scheduleMode: z.enum(["all_day", "custom_time", "interval_days"]),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    totalCharges: z.number().int().min(1, "충전 횟수는 1 이상이어야 합니다.").max(200, "충전 횟수는 200까지 입력할 수 있습니다."),
    intervalDays: z.number().int().min(1, "주기는 1일 이상이어야 합니다.").max(365, "주기는 365일까지 설정할 수 있습니다.").nullable(),
    anchorDate: z.string().nullable(),
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "종료 시각은 시작 시각보다 늦어야 합니다.",
    path: ["endMinute"],
  })
  .superRefine((value, context) => {
    if (value.scheduleMode === "interval_days") {
      if (value.intervalDays === null) {
        context.addIssue({ code: "custom", message: "충전 주기를 입력해주세요.", path: ["intervalDays"] });
      }
      if (value.anchorDate !== null && !isValidDateString(value.anchorDate)) {
        context.addIssue({ code: "custom", message: "이전 버전의 첫 충전 날짜가 올바르지 않습니다.", path: ["anchorDate"] });
      }
      if (value.totalCharges !== 1) {
        context.addIssue({ code: "custom", message: "주기형 스택은 한 주기마다 1회 충전됩니다.", path: ["totalCharges"] });
      }
      return;
    }
    if (value.intervalDays !== null || value.anchorDate !== null) {
      context.addIssue({ code: "custom", message: "매일 충전 방식에는 일수 주기를 저장할 수 없습니다.", path: ["intervalDays"] });
    }
  });

export type StackTrackerInput = z.infer<typeof stackTrackerInputSchema>;
