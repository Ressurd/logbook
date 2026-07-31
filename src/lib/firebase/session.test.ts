import "fake-indexeddb/auto";

import { describe, expect, it, vi } from "vitest";

import { normalizeSearchText } from "@/features/logbook/model/logEntry.mapper";
import type { CachedLogEntry } from "@/features/logbook/model/logEntry.types";
import {
  putCachedLogEntries,
  searchCachedLogs,
  setSearchSyncMeta,
} from "@/features/logbook/search/searchDb";

import { signOutAndClearUserCache } from "./session";

function cached(
  uid: string,
  id: string,
  sourceType: CachedLogEntry["sourceType"] = "manual_log",
): CachedLogEntry {
  return {
    key: `${uid}:${sourceType}:${id}`,
    uid,
    id,
    content: id,
    normalizedContent: normalizeSearchText(id),
    sourceType,
    occurredAt: 1,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  };
}

describe("로그아웃 검색 캐시 정리", () => {
  it("로그아웃 UID만 삭제하고 다른 계정 namespace는 유지한다", async () => {
    const firstUid = "logout-first";
    const secondUid = "logout-second";
    await putCachedLogEntries([
      cached(firstUid, "first-record"),
      cached(firstUid, "first-stack-record", "stack_event"),
      cached(secondUid, "second-record"),
      cached(secondUid, "second-stack-record", "stack_event"),
    ]);
    await setSearchSyncMeta({ key: `${firstUid}:manual_log`, uid: firstUid, sourceType: "manual_log", phase: "ready", cursor: null });
    await setSearchSyncMeta({ key: `${firstUid}:stack_event`, uid: firstUid, sourceType: "stack_event", phase: "ready", cursor: null });
    await setSearchSyncMeta({ key: `${secondUid}:manual_log`, uid: secondUid, sourceType: "manual_log", phase: "ready", cursor: null });
    await setSearchSyncMeta({ key: `${secondUid}:stack_event`, uid: secondUid, sourceType: "stack_event", phase: "ready", cursor: null });
    const signOut = vi.fn(async () => undefined);

    await signOutAndClearUserCache(firstUid, { signOut });

    expect(signOut).toHaveBeenCalledOnce();
    expect((await searchCachedLogs(firstUid, "record")).entries).toHaveLength(0);
    expect((await searchCachedLogs(secondUid, "record")).entries).toHaveLength(2);
  });
});
