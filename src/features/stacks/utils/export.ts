import type { ExportableStackEvent, ExportableStackTracker } from "../model/stack.types";
import { KST_TIME_ZONE } from "@/features/logbook/utils/date";

export function createStackJsonBackup(
  data: { trackers: ExportableStackTracker[]; events: ExportableStackEvent[] },
  exportedAt = new Date(),
): string {
  return JSON.stringify({
    version: 1,
    exportedAt: exportedAt.toISOString(),
    timezone: KST_TIME_ZONE,
    trackers: data.trackers.map((tracker) => ({
      id: tracker.id,
      name: tracker.name,
      scheduleMode: tracker.scheduleMode,
      startMinute: tracker.startMinute,
      endMinute: tracker.endMinute,
      totalCharges: tracker.totalCharges,
      intervalDays: tracker.intervalDays,
      anchorDate: tracker.anchorDate,
      isActive: tracker.isActive,
      createdAt: tracker.createdAt.toISOString(),
      updatedAt: tracker.updatedAt.toISOString(),
    })),
    events: data.events.map((event) => ({
      id: event.id,
      trackerId: event.trackerId,
      trackerName: event.trackerName,
      eventType: event.eventType,
      periodDate: event.periodDate,
      chargeIndex: event.chargeIndex,
      amount: event.amount,
      occurredAt: event.occurredAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
    })),
  }, null, 2);
}
