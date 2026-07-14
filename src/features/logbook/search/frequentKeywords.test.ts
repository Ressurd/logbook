import { describe, expect, it } from "vitest";

import { extractKeywords, rankFrequentKeywords } from "./frequentKeywords";

describe("자주 쓴 단어", () => {
  it("한글 조사와 구두점을 정리하고 같은 기록 안의 중복은 한 번만 센다", () => {
    expect(extractKeywords("블로그를 쓰고, 블로그는 다시 확인! NextJS 2026")).toEqual(
      ["블로그", "쓰고", "다시", "확인", "nextjs"],
    );
  });

  it("두 개 이상의 기록에 나온 단어를 빈도순으로 정렬한다", () => {
    const result = rankFrequentKeywords([
      "블로그 메이플 기록",
      "블로그 아이디어 기록",
      "블로그 기록 정리",
      "메이플 장비 확인",
    ]);

    expect(result).toEqual([
      { word: "기록", count: 3 },
      { word: "블로그", count: 3 },
      { word: "메이플", count: 2 },
    ]);
  });

  it("최소 빈도와 표시 개수를 적용한다", () => {
    expect(
      rankFrequentKeywords(["검색 기록", "검색 테스트", "기록 테스트"], {
        minimumCount: 1,
        limit: 2,
      }),
    ).toHaveLength(2);
  });
});
