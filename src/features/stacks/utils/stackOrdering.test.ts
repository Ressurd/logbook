import { describe, expect, it } from "vitest";

import { compareStackTrackerOrder, getSwappedStackSortOrders } from "./stackOrdering";

describe("스택 표시 순서", () => {
  it("저장된 순서가 같으면 생성 시각과 문서 ID로 안정적으로 정렬한다", () => {
    const createdAt = new Date("2026-08-01T00:00:00.000Z");
    const trackers = [
      { id: "b", sortOrder: 1, createdAt },
      { id: "later", sortOrder: 1, createdAt: new Date(createdAt.getTime() + 1) },
      { id: "a", sortOrder: 1, createdAt },
    ];

    expect(trackers.sort(compareStackTrackerOrder).map((tracker) => tracker.id)).toEqual([
      "a",
      "b",
      "later",
    ]);
  });

  it("서로 다른 순서 값을 맞바꾼다", () => {
    expect(getSwappedStackSortOrders(100, 200)).toEqual({ earlier: 200, later: 100 });
  });

  it("동일한 순서 값도 뒤 항목이 앞으로 오도록 분리한다", () => {
    const swapped = getSwappedStackSortOrders(100, 100);
    expect(swapped.later).toBeLessThan(swapped.earlier);
  });
});
