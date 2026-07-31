import type { LogEntry } from "@/features/logbook/model/logEntry.types";
import type { StackEvent } from "@/features/stacks/model/stack.types";

export type TimelineEntry =
  | { key: string; sourceType: "manual_log"; occurredAt: Date; log: LogEntry }
  | { key: string; sourceType: "stack_event"; occurredAt: Date; event: StackEvent };

export function mergeTimelineEntries(
  logs: readonly LogEntry[],
  events: readonly StackEvent[],
): TimelineEntry[] {
  return [
    ...logs.map((log): TimelineEntry => ({ key: `manual:${log.id}`, sourceType: "manual_log", occurredAt: log.createdAt, log })),
    ...events.map((event): TimelineEntry => ({ key: `stack:${event.id}`, sourceType: "stack_event", occurredAt: event.occurredAt, event })),
  ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime() || right.key.localeCompare(left.key));
}

