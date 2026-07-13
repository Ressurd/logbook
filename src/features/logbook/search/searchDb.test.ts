import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import type { CachedLogEntry } from "../model/logEntry.types";
import { normalizeSearchText } from "../model/logEntry.mapper";
import {
  clearSearchCache,
  putCachedLogEntries,
  searchCachedLogs,
} from "./searchDb";

function cached(
  uid: string,
  id: string,
  content: string,
  createdAt: number,
  deletedAt: number | null = null,
): CachedLogEntry {
  return {
    key: `${uid}:${id}`,
    uid,
    id,
    content,
    normalizedContent: normalizeSearchText(content),
    createdAt,
    updatedAt: createdAt,
    deletedAt,
  };
}

describe("IndexedDB 검색 캐시", () => {
  it("한국어 부분 문자열을 검색하고 최신순으로 정렬한다", async () => {
    const uid = "search-korean";
    await clearSearchCache(uid);
    await putCachedLogEntries([
      cached(uid, "old", "블로그 글감 떠오름", 10),
      cached(uid, "new", "새 블로그 초안", 20),
    ]);
    const result = await searchCachedLogs(uid, "  블로그  ");
    expect(result.entries.map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("대소문자를 구분하지 않고 삭제 항목을 제외한다", async () => {
    const uid = "search-case";
    await clearSearchCache(uid);
    await putCachedLogEntries([
      cached(uid, "active", "NextJS 메모", 20),
      cached(uid, "deleted", "NEXTJS 삭제", 30, 31),
    ]);
    const result = await searchCachedLogs(uid, "nextjs");
    expect(result.entries.map((item) => item.id)).toEqual(["active"]);
  });

  it("표시 개수를 제한하고 전체 개수를 반환한다", async () => {
    const uid = "search-limit";
    await clearSearchCache(uid);
    await putCachedLogEntries([
      cached(uid, "1", "공통", 1),
      cached(uid, "2", "공통", 2),
      cached(uid, "3", "공통", 3),
    ]);
    const result = await searchCachedLogs(uid, "공통", 2);
    expect(result.entries).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it("UID namespace를 분리해 다른 계정의 기록을 노출하지 않는다", async () => {
    const firstUid = "namespace-first";
    const secondUid = "namespace-second";
    await clearSearchCache(firstUid);
    await clearSearchCache(secondUid);
    await putCachedLogEntries([
      cached(firstUid, "first", "공유 검색어 첫 계정", 1),
      cached(secondUid, "second", "공유 검색어 둘째 계정", 2),
    ]);

    const firstResult = await searchCachedLogs(firstUid, "공유 검색어");
    const secondResult = await searchCachedLogs(secondUid, "공유 검색어");
    expect(firstResult.entries.map((item) => item.id)).toEqual(["first"]);
    expect(secondResult.entries.map((item) => item.id)).toEqual(["second"]);
  });
});
