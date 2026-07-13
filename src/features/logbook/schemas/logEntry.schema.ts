import { z } from "zod";

export const logContentSchema = z
  .string()
  .trim()
  .min(1, "내용을 입력해주세요.")
  .max(10_000, "내용은 10,000자 이하로 입력해주세요.");

export const createLogEntrySchema = z.object({
  content: logContentSchema,
});

export const updateLogEntrySchema = z.object({
  id: z.string().min(1),
  content: logContentSchema,
});
