import type { Timestamp } from "firebase/firestore";

export type StackScheduleMode = "all_day" | "custom_time" | "interval_days";
export type StackEventType = "charge" | "consume";

export type FirestoreStackTracker = {
  name: string;
  scheduleMode: StackScheduleMode;
  startMinute: number;
  endMinute: number;
  totalCharges: number;
  intervalDays?: number | null;
  anchorDate?: string | null;
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type StackTracker = {
  id: string;
  name: string;
  scheduleMode: StackScheduleMode;
  startMinute: number;
  endMinute: number;
  totalCharges: number;
  intervalDays: number | null;
  anchorDate: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  hasPendingWrites: boolean;
};

export type FirestoreStackEvent = {
  trackerId: string;
  trackerName: string;
  eventType: StackEventType;
  periodDate: string;
  chargeIndex: number | null;
  amount: 1 | -1;
  occurredAt: Timestamp | null;
  createdAt: Timestamp | null;
};

export type StackEvent = {
  id: string;
  trackerId: string;
  trackerName: string;
  eventType: StackEventType;
  periodDate: string;
  chargeIndex: number | null;
  amount: 1 | -1;
  occurredAt: Date;
  createdAt: Date;
  hasPendingWrites: boolean;
};

export type ExportableStackTracker = Omit<StackTracker, "hasPendingWrites">;
export type ExportableStackEvent = Omit<StackEvent, "hasPendingWrites">;
