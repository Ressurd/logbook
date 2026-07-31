import { describe, expect, it } from "vitest";

import { collectAllStackPages } from "./fetchStacks";

describe("스택 백업 페이지네이션", () => {
  it("모든 페이지를 순회하고 문서 ID 중복은 마지막 값으로 upsert한다", async () => {
    const result = await collectAllStackPages(async (cursor) => cursor === null
      ? { entries: [{ id: "a", value: 1 }, { id: "b", value: 1 }], cursor: { seconds: 1, nanoseconds: 0, documentId: "b" }, hasMore: true }
      : { entries: [{ id: "b", value: 2 }, { id: "c", value: 1 }], cursor: { seconds: 2, nanoseconds: 0, documentId: "c" }, hasMore: false });
    expect(result).toEqual([{ id: "a", value: 1 }, { id: "b", value: 2 }, { id: "c", value: 1 }]);
  });

  it("커서가 진행되지 않으면 무한 순회를 막는다", async () => {
    const fixed = { seconds: 1, nanoseconds: 0, documentId: "a" };
    let calls = 0;
    await expect(collectAllStackPages(async () => {
      calls += 1;
      return { entries: [], cursor: fixed, hasMore: true };
    })).rejects.toThrow("커서가 진행되지 않았습니다");
    expect(calls).toBe(2);
  });

  it("네트워크 실패를 전파해 불완전한 파일 생성을 막는다", async () => {
    await expect(collectAllStackPages(async () => { throw new Error("network"); })).rejects.toThrow("network");
  });
});

