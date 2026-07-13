import { describe, expect, it } from "vitest";

import {
  collectAllActiveLogs,
  retryFirestoreRead,
  type ActiveLogPage,
} from "./fetchLogs";
import type {
  ExportableLogEntry,
  FirestorePageCursor,
} from "../model/logEntry.types";

function exported(id: number): ExportableLogEntry {
  const date = new Date(id * 1_000);
  return {
    id: `log-${id}`,
    content: `기록 ${id}`,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  };
}

function pageCursor(page: number): FirestorePageCursor {
  return { seconds: page, nanoseconds: 0, documentId: `cursor-${page}` };
}

describe("백업 전체 페이지 수집", () => {
  it("200개 단위 페이지를 끝까지 순회하고 ID 중복을 upsert한다", async () => {
    const all = Array.from({ length: 1_001 }, (_, index) => exported(index));
    let pageIndex = 0;
    const fetchPage = async (): Promise<ActiveLogPage> => {
      const start = pageIndex * 200;
      const entries = all.slice(start, start + 200);
      if (pageIndex === 3) entries.push(all[10]);
      pageIndex += 1;
      return {
        entries,
        cursor: entries.length ? pageCursor(pageIndex) : null,
        hasMore: start + 200 < all.length,
      };
    };

    const result = await collectAllActiveLogs(fetchPage);

    expect(pageIndex).toBe(6);
    expect(result).toHaveLength(1_001);
    expect(new Set(result.map((item) => item.id)).size).toBe(1_001);
    expect(result[0]?.id).toBe("log-1000");
  });

  it("중간 네트워크 오류를 그대로 전파해 불완전한 백업 생성을 막는다", async () => {
    let page = 0;
    await expect(
      collectAllActiveLogs(async () => {
        page += 1;
        if (page === 2) throw new Error("network failed");
        return {
          entries: [exported(1)],
          cursor: pageCursor(1),
          hasMore: true,
        };
      }),
    ).rejects.toThrow("network failed");
  });

  it("진행하지 않는 cursor를 감지한다", async () => {
    const sameCursor = pageCursor(1);
    let call = 0;
    await expect(
      collectAllActiveLogs(async () => {
        call += 1;
        return {
          entries: [exported(call)],
          cursor: sameCursor,
          hasMore: true,
        };
      }),
    ).rejects.toThrow("커서가 진행되지 않았습니다");
  });

  it("일시적 Firestore 읽기 오류는 제한적으로 재시도한다", async () => {
    let attempts = 0;
    const waits: number[] = [];
    const result = await retryFirestoreRead(
      async () => {
        attempts += 1;
        if (attempts < 3) throw { code: "firestore/unavailable" };
        return "complete";
      },
      [10, 20],
      async (milliseconds) => {
        waits.push(milliseconds);
      },
    );

    expect(result).toBe("complete");
    expect(attempts).toBe(3);
    expect(waits).toEqual([10, 20]);
  });

  it("권한 오류는 재시도하지 않는다", async () => {
    let attempts = 0;
    await expect(
      retryFirestoreRead(async () => {
        attempts += 1;
        throw { code: "permission-denied" };
      }),
    ).rejects.toEqual({ code: "permission-denied" });
    expect(attempts).toBe(1);
  });
});
