import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import type { CachedLogEntry } from "../model/logEntry.types";
import { normalizeSearchText } from "../model/logEntry.mapper";
import {
  clearSearchCache,
  getFrequentCachedKeywords,
  putCachedLogEntries,
  searchCachedLogs,
} from "./searchDb";

function cached(
  uid: string,
  id: string,
  content: string,
  createdAt: number,
  deletedAt: number | null = null,
  sourceType: CachedLogEntry["sourceType"] = "manual_log",
): CachedLogEntry {
  return {
    key: `${uid}:${sourceType}:${id}`,
    uid,
    id,
    content,
    normalizedContent: normalizeSearchText(content),
    sourceType,
    occurredAt: createdAt,
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

  it("현재 UID의 삭제되지 않은 기록만 자주 쓴 단어에 반영한다", async () => {
    const uid = "frequent-words-owner";
    const otherUid = "frequent-words-other";
    await clearSearchCache(uid);
    await clearSearchCache(otherUid);
    await putCachedLogEntries([
      cached(uid, "1", "블로그 아이디어", 1),
      cached(uid, "2", "블로그 초안", 2),
      cached(uid, "3", "비밀 비밀", 3, 4),
      cached(otherUid, "4", "비밀 비밀", 4),
      cached(otherUid, "5", "비밀 메모", 5),
      cached(uid, "stack", "블로그 스택 +1 충전", 6, null, "stack_event"),
    ]);

    expect(await getFrequentCachedKeywords(uid)).toEqual([
      { word: "블로그", count: 2 },
    ]);
  });

  it("스택 이벤트도 검색하지만 UID namespace는 완전히 분리한다", async () => {
    const uid = "stack-search-owner";
    const otherUid = "stack-search-other";
    await clearSearchCache(uid);
    await clearSearchCache(otherUid);
    await putCachedLogEntries([
      cached(uid, "event", "[휴식] 스택 1회 사용", 20, null, "stack_event"),
      cached(otherUid, "event", "휴식 스택 +1 충전", 30, null, "stack_event"),
    ]);
    const result = await searchCachedLogs(uid, "휴식");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].sourceType).toBe("stack_event");
    expect(result.entries[0].content).toContain("1회 사용");
  });
});
