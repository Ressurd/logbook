import { describe, expect, it } from "vitest";

import { parseMobileEnterMode } from "./mobileEnterMode";

describe("모바일 Enter 동작 설정", () => {
  it("저장 모드를 복원한다", () => {
    expect(parseMobileEnterMode("submit")).toBe("submit");
  });

  it("설정이 없거나 손상되면 안전하게 줄바꿈을 사용한다", () => {
    expect(parseMobileEnterMode(null)).toBe("newline");
    expect(parseMobileEnterMode("unknown")).toBe("newline");
  });
});
