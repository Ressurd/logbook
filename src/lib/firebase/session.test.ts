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

function cached(uid: string, id: string): CachedLogEntry {
  return {
    key: `${uid}:${id}`,
    uid,
    id,
    content: id,
    normalizedContent: normalizeSearchText(id),
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
      cached(secondUid, "second-record"),
    ]);
    await setSearchSyncMeta({ uid: firstUid, phase: "ready", cursor: null });
    await setSearchSyncMeta({ uid: secondUid, phase: "ready", cursor: null });
    const signOut = vi.fn(async () => undefined);

    await signOutAndClearUserCache(firstUid, { signOut });

    expect(signOut).toHaveBeenCalledOnce();
    expect((await searchCachedLogs(firstUid, "record")).entries).toHaveLength(0);
    expect((await searchCachedLogs(secondUid, "record")).entries).toHaveLength(1);
  });
});
