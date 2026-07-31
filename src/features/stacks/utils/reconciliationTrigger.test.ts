import { afterEach, describe, expect, it, vi } from "vitest";

import { createReconciliationTriggerDebouncer } from "./reconciliationTrigger";

afterEach(() => vi.useRealTimers());

describe("reconciliation 트리거 병합", () => {
  it("visibility와 online 신호가 연속으로 와도 마지막 한 번만 실행한다", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const debouncer = createReconciliationTriggerDebouncer(run, 600);
    debouncer.trigger();
    vi.advanceTimersByTime(300);
    debouncer.trigger();
    vi.advanceTimersByTime(599);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledOnce();
  });

  it("취소하면 예약된 실행을 남기지 않는다", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const debouncer = createReconciliationTriggerDebouncer(run);
    debouncer.trigger();
    debouncer.cancel();
    vi.runAllTimers();
    expect(run).not.toHaveBeenCalled();
  });
});

