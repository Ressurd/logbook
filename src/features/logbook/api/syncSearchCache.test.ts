import { describe, expect, it } from "vitest";

import {
  CHANGE_SYNC_OVERLAP_SECONDS,
  createIncrementalStartCursor,
  performSearchSync,
  type SearchSyncDependencies,
} from "./syncSearchCache";
import type { LogChangePage } from "./fetchLogs";
import type {
  CachedLogEntry,
  FirestorePageCursor,
  LogEntry,
} from "../model/logEntry.types";
import type { SearchSyncMeta } from "../search/searchDb";

function cursor(
  seconds: number,
  documentId: string,
  nanoseconds = 0,
): FirestorePageCursor {
  return { seconds, nanoseconds, documentId };
}

function entry(
  id: string,
  updatedAtSeconds: number,
  deleted = false,
): LogEntry {
  const updatedAt = new Date(updatedAtSeconds * 1_000);
  return {
    id,
    content: `기록 ${id}`,
    createdAt: updatedAt,
    updatedAt,
    deletedAt: deleted ? updatedAt : null,
    hasPendingWrites: false,
  };
}

function createMemoryDependencies(
  initialMeta: SearchSyncMeta | undefined,
  fetchPage: SearchSyncDependencies["fetchPage"],
) {
  let meta = initialMeta;
  const cache = new Map<string, CachedLogEntry>();
  const dependencies: SearchSyncDependencies = {
    getMeta: async () => meta,
    setMeta: async (nextMeta) => {
      meta = structuredClone(nextMeta);
    },
    putEntries: async (entries) => {
      for (const item of entries) cache.set(item.id, item);
    },
    fetchPage,
  };
  return { dependencies, cache, getMeta: () => meta };
}

describe("검색 캐시 동기화", () => {
  it("동일 Timestamp 문서를 documentId 커서로 빠짐없이 페이지 순회한다", async () => {
    const firstCursor = cursor(100, "b", 42);
    const finalCursor = cursor(100, "d", 42);
    const requested: Array<FirestorePageCursor | null> = [];
    const memory = createMemoryDependencies(undefined, async (_uid, options) => {
      requested.push(options.cursor);
      if (!options.cursor) {
        return {
          entries: [entry("a", 100), entry("b", 100)],
          cursor: firstCursor,
          hasMore: true,
        };
      }
      return {
        entries: [entry("c", 100), entry("d", 100)],
        cursor: finalCursor,
        hasMore: false,
      };
    });

    await performSearchSync("user", memory.dependencies);

    expect(requested).toEqual([null, firstCursor]);
    expect([...memory.cache.keys()]).toEqual(["a", "b", "c", "d"]);
    expect(memory.getMeta()).toEqual({
      key: "user:manual_log",
      uid: "user",
      sourceType: "manual_log",
      phase: "ready",
      cursor: finalCursor,
    });
  });

  it("전체 동기화 실패 지점부터 재개하며 기존 upsert를 보존한다", async () => {
    const firstCursor = cursor(10, "page-1");
    const finalCursor = cursor(20, "page-2");
    let fail = true;
    const memory = createMemoryDependencies(undefined, async (_uid, options) => {
      if (!options.cursor) {
        return {
          entries: [entry("one", 10)],
          cursor: firstCursor,
          hasMore: true,
        };
      }
      if (fail) throw new Error("network");
      return {
        entries: [entry("two", 20)],
        cursor: finalCursor,
        hasMore: false,
      };
    });

    await expect(performSearchSync("user", memory.dependencies)).rejects.toThrow(
      "network",
    );
    expect(memory.getMeta()).toEqual({
      key: "user:manual_log",
      uid: "user",
      sourceType: "manual_log",
      phase: "full",
      cursor: firstCursor,
    });

    fail = false;
    await performSearchSync("user", memory.dependencies);
    expect([...memory.cache.keys()]).toEqual(["one", "two"]);
    expect(memory.getMeta()?.cursor).toEqual(finalCursor);
  });

  it("증분 실패 시 high-water cursor를 전진시키지 않고 겹친 구간을 재조회한다", async () => {
    const initialCursor = cursor(1_000, "z", 99);
    const nextCursor = cursor(1_001, "a");
    let attempts = 0;
    const requested: Array<{
      cursor: FirestorePageCursor | null;
      inclusiveTimestamp?: boolean;
    }> = [];
    const memory = createMemoryDependencies(
      { key: "user:manual_log", uid: "user", sourceType: "manual_log", phase: "ready", cursor: initialCursor },
      async (_uid, options): Promise<LogChangePage> => {
        requested.push(options);
        attempts += 1;
        if (attempts === 1) {
          return {
            entries: [entry("late-same-time", 1_000)],
            cursor: nextCursor,
            hasMore: true,
          };
        }
        if (attempts === 2) throw new Error("interrupted");
        return {
          entries: [entry("late-same-time", 1_000), entry("new", 1_001)],
          cursor: nextCursor,
          hasMore: false,
        };
      },
    );

    await expect(performSearchSync("user", memory.dependencies)).rejects.toThrow(
      "interrupted",
    );
    expect(memory.getMeta()?.cursor).toEqual(initialCursor);

    await performSearchSync("user", memory.dependencies);
    expect(requested[0]).toEqual({
      cursor: createIncrementalStartCursor(initialCursor),
      inclusiveTimestamp: true,
    });
    expect(requested[2]).toEqual(requested[0]);
    expect([...memory.cache.keys()].sort()).toEqual(["late-same-time", "new"]);
    expect(memory.getMeta()?.cursor).toEqual(nextCursor);
  });

  it("소프트 삭제 문서도 upsert해 검색 캐시에서 제외할 수 있게 한다", async () => {
    const memory = createMemoryDependencies(undefined, async () => ({
      entries: [entry("deleted", 100, true)],
      cursor: cursor(100, "deleted"),
      hasMore: false,
    }));

    await performSearchSync("user", memory.dependencies);
    expect(memory.cache.get("deleted")?.deletedAt).toBe(100_000);
  });

  it("증분 시작점은 서버 high-water mark보다 고정 구간 앞이다", () => {
    expect(createIncrementalStartCursor(cursor(1_000, "z", 123))).toEqual({
      seconds: 1_000 - CHANGE_SYNC_OVERLAP_SECONDS,
      nanoseconds: 0,
      documentId: "",
    });
  });
});
