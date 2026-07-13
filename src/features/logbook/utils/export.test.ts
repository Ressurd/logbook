import { describe, expect, it } from "vitest";

import type { ExportableLogEntry } from "../model/logEntry.types";
import { createCsvBackup, createJsonBackup } from "./export";

const entry: ExportableLogEntry = {
  id: "log-1",
  content: "쉼표, \"따옴표\"\n다음 줄",
  createdAt: new Date("2026-07-13T05:23:17.000Z"),
  updatedAt: new Date("2026-07-13T05:24:00.000Z"),
  deletedAt: null,
};

describe("백업 유틸리티", () => {
  it("버전과 시간대를 포함한 JSON을 직렬화한다", () => {
    const result = JSON.parse(
      createJsonBackup([entry], new Date("2026-07-13T09:00:00.000Z")),
    );
    expect(result.version).toBe(1);
    expect(result.timezone).toBe("Asia/Seoul");
    expect(result.entries[0].createdAt).toBe("2026-07-13T05:23:17.000Z");
  });

  it("빈 데이터 JSON을 만든다", () => {
    const result = JSON.parse(createJsonBackup([]));
    expect(result.entries).toEqual([]);
  });

  it("CSV에 BOM과 한국 날짜 및 시간을 포함한다", () => {
    const csv = createCsvBackup([entry]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"2026-07-13"');
    expect(csv).toContain('"14:23:17"');
  });

  it("쉼표, 큰따옴표, 줄바꿈을 escaping한다", () => {
    const csv = createCsvBackup([entry]);
    expect(csv).toContain('"쉼표, ""따옴표""\n다음 줄"');
  });

  it("빈 CSV에도 헤더와 BOM을 포함한다", () => {
    const csv = createCsvBackup([]);
    expect(csv).toBe(
      "\uFEFFid,date_kst,time_kst,content,created_at,updated_at,deleted_at",
    );
  });
});
