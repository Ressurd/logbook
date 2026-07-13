export const WRITE_QUEUE_GRACE_MS = 1_500;

export type WriteOutcome =
  | { status: "committed" }
  | { status: "queued"; completion: Promise<void> };

export function waitForWriteOrQueue(
  completion: Promise<unknown>,
  graceMs = WRITE_QUEUE_GRACE_MS,
): Promise<WriteOutcome> {
  const normalizedCompletion = completion.then(() => undefined);

  return new Promise((resolve, reject) => {
    let waiting = true;
    const timer = setTimeout(() => {
      waiting = false;
      resolve({ status: "queued", completion: normalizedCompletion });
    }, graceMs);

    void normalizedCompletion.then(
      () => {
        if (!waiting) return;
        waiting = false;
        clearTimeout(timer);
        resolve({ status: "committed" });
      },
      (error: unknown) => {
        if (!waiting) return;
        waiting = false;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
