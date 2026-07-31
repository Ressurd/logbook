import { Clock3, Minus, Zap } from "lucide-react";

import type { StackEvent } from "@/features/stacks/model/stack.types";
import { formatKstTime } from "@/features/logbook/utils/date";

export function StackEventItem({ event }: { event: StackEvent }) {
  const charge = event.eventType === "charge";
  return (
    <article className="log-entry stack-timeline-entry">
      <div className="entry-time">
        <time dateTime={event.occurredAt.toISOString()}>{formatKstTime(event.occurredAt)}</time>
        {event.hasPendingWrites ? <span className="pending-label"><Clock3 size={12} /> 대기 중</span> : null}
      </div>
      <p className="entry-content stack-timeline-content">
        <span className={charge ? "stack-event-charge" : "stack-event-consume"}>{charge ? <Zap size={14} /> : <Minus size={14} />}{charge ? "충전" : "사용"}</span>
        <span><strong>[{event.trackerName}]</strong> 스택 {charge ? "+1 충전" : "1회 사용"}</span>
      </p>
    </article>
  );
}
