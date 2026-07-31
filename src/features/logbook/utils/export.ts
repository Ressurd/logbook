import type { ExportableLogEntry } from "../model/logEntry.types";
import {
  formatKstDateShort,
  formatKstTime,
  getTodayKstDateString,
  KST_TIME_ZONE,
} from "./date";

export type LogbookBackup = {
  version: 1;
  exportedAt: string;
  timezone: typeof KST_TIME_ZONE;
  entries: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }>;
};

export function createJsonBackup(
  entries: ExportableLogEntry[],
  exportedAt = new Date(),
): string {
  const backup: LogbookBackup = {
    version: 1,
    exportedAt: exportedAt.toISOString(),
    timezone: KST_TIME_ZONE,
    entries: entries.map((entry) => ({
      id: entry.id,
      content: entry.content,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      deletedAt: entry.deletedAt?.toISOString() ?? null,
    })),
  };

  return JSON.stringify(backup, null, 2);
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function createCsvBackup(entries: ExportableLogEntry[]): string {
  const header = [
    "id",
    "date_kst",
    "time_kst",
    "content",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const rows = entries.map((entry) =>
    [
      entry.id,
      formatKstDateShort(entry.createdAt).replaceAll(".", "-"),
      formatKstTime(entry.createdAt),
      entry.content,
      entry.createdAt.toISOString(),
      entry.updatedAt.toISOString(),
      entry.deletedAt?.toISOString() ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return `\uFEFF${[header.join(","), ...rows].join("\r\n")}`;
}

export function downloadTextFile(
  content: string,
  extension: "json" | "csv",
): void {
  downloadNamedTextFile(
    content,
    `logbook-backup-${getTodayKstDateString()}.${extension}`,
    extension === "json" ? "application/json" : "text/csv",
  );
}

export function downloadNamedTextFile(
  content: string,
  filename: string,
  type = "application/json",
): void {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
