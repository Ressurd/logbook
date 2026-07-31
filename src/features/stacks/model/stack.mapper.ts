import type { DocumentSnapshot, SnapshotOptions } from "firebase/firestore";

import type {
  FirestoreStackEvent,
  FirestoreStackTracker,
  StackEvent,
  StackTracker,
} from "./stack.types";
import type { CachedLogEntry } from "@/features/logbook/model/logEntry.types";
import { normalizeSearchText } from "@/features/logbook/model/logEntry.mapper";

export function mapStackTrackerDocument(
  snapshot: DocumentSnapshot<FirestoreStackTracker>,
  options?: SnapshotOptions,
): StackTracker {
  const data = snapshot.data(options);
  if (!data) throw new Error("스택 트래커 문서의 데이터가 없습니다.");
  const fallback = new Date();
  const createdAt = data.createdAt?.toDate() ?? fallback;
  return {
    id: snapshot.id,
    name: data.name,
    scheduleMode: data.scheduleMode,
    startMinute: data.startMinute,
    endMinute: data.endMinute,
    totalCharges: data.totalCharges,
    intervalDays: data.intervalDays ?? null,
    anchorDate: data.anchorDate ?? null,
    sortOrder: typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)
      ? data.sortOrder
      : createdAt.getTime(),
    isActive: data.isActive,
    createdAt,
    updatedAt: data.updatedAt?.toDate() ?? createdAt,
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
  };
}

export function mapStackEventDocument(
  snapshot: DocumentSnapshot<FirestoreStackEvent>,
  options?: SnapshotOptions,
): StackEvent {
  const data = snapshot.data(options);
  if (!data) throw new Error("스택 이벤트 문서의 데이터가 없습니다.");
  const fallback = new Date();
  return {
    id: snapshot.id,
    trackerId: data.trackerId,
    trackerName: data.trackerName,
    eventType: data.eventType,
    periodDate: data.periodDate,
    chargeIndex: data.chargeIndex,
    amount: data.amount,
    occurredAt: data.occurredAt?.toDate() ?? fallback,
    createdAt: data.createdAt?.toDate() ?? data.occurredAt?.toDate() ?? fallback,
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
  };
}

export function toCachedStackEvent(uid: string, event: StackEvent): CachedLogEntry {
  const content = `[${event.trackerName}] 스택 ${event.eventType === "charge" ? "+1 충전" : "1회 사용"}`;
  return {
    key: `${uid}:stack_event:${event.id}`,
    uid,
    id: event.id,
    sourceType: "stack_event",
    content,
    normalizedContent: normalizeSearchText(content),
    occurredAt: event.occurredAt.getTime(),
    createdAt: event.createdAt.getTime(),
    updatedAt: event.createdAt.getTime(),
    deletedAt: null,
  };
}
