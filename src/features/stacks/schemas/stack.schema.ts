import { z } from "zod";

export const stackTrackerInputSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해주세요.").max(50, "이름은 50자까지 입력할 수 있습니다."),
    scheduleMode: z.enum(["all_day", "custom_time"]),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    totalCharges: z.number().int().min(1, "충전 횟수는 1 이상이어야 합니다.").max(200, "충전 횟수는 200까지 입력할 수 있습니다."),
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "종료 시각은 시작 시각보다 늦어야 합니다.",
    path: ["endMinute"],
  });

export type StackTrackerInput = z.infer<typeof stackTrackerInputSchema>;

