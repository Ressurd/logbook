import { describe, expect, it, vi } from "vitest";

import { waitForWriteOrQueue } from "./writeQueue";

describe("오프라인 쓰기 대기", () => {
  it("grace 시간 전에 완료되면 committed를 반환한다", async () => {
    await expect(waitForWriteOrQueue(Promise.resolve(), 100)).resolves.toEqual({
      status: "committed",
    });
  });

  it("grace 시간 전에 실패하면 오류를 전파한다", async () => {
    await expect(
      waitForWriteOrQueue(Promise.reject(new Error("denied")), 100),
    ).rejects.toThrow("denied");
  });

  it("오래 걸리는 쓰기는 queued로 반환하고 나중 완료 상태를 제공한다", async () => {
    vi.useFakeTimers();
    let resolveWrite: () => void = () => undefined;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    const outcomePromise = waitForWriteOrQueue(write, 1_500);

    await vi.advanceTimersByTimeAsync(1_500);
    const outcome = await outcomePromise;
    expect(outcome.status).toBe("queued");
    resolveWrite();
    if (outcome.status === "queued") {
      await expect(outcome.completion).resolves.toBeUndefined();
    }
    vi.useRealTimers();
  });
});
