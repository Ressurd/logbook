"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Modal } from "@/components/common/Modal";
import type { StackTracker } from "@/features/stacks/model/stack.types";
import { stackTrackerInputSchema, type StackTrackerInput } from "@/features/stacks/schemas/stack.schema";
import {
  calculateChargeSchedule,
  formatChargeInterval,
  minuteToTime,
  timeToMinute,
} from "@/features/stacks/utils/stackCalculations";
import { formatKstTime, getTodayKstDateString } from "@/features/logbook/utils/date";

type FormState = {
  name: string;
  scheduleMode: "all_day" | "custom_time";
  startTime: string;
  endTime: string;
  totalCharges: string;
};

function initialState(tracker?: StackTracker | null): FormState {
  return tracker
    ? {
        name: tracker.name,
        scheduleMode: tracker.scheduleMode,
        startTime: minuteToTime(tracker.startMinute),
        endTime: minuteToTime(tracker.endMinute),
        totalCharges: String(tracker.totalCharges),
      }
    : { name: "", scheduleMode: "all_day", startTime: "00:00", endTime: "24:00", totalCharges: "24" };
}

export function StackTrackerForm({
  open,
  tracker,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  tracker?: StackTracker | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: StackTrackerInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(tracker));
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const allDay = form.scheduleMode === "all_day";
    const startMinute = allDay ? 0 : timeToMinute(form.startTime);
    const endMinute = allDay ? 1440 : timeToMinute(form.endTime, true);
    return stackTrackerInputSchema.safeParse({
      name: form.name,
      scheduleMode: form.scheduleMode,
      startMinute,
      endMinute,
      totalCharges: Number(form.totalCharges),
    });
  }, [form]);

  const preview = useMemo(() => {
    if (!parsed.success) return null;
    const schedule = calculateChargeSchedule(parsed.data, getTodayKstDateString());
    const samples = schedule.length <= 4
      ? schedule
      : [schedule[0], schedule[1], schedule.at(-2)!, schedule.at(-1)!];
    return {
      interval: formatChargeInterval(parsed.data),
      times: samples.map(formatKstTime),
      omitted: schedule.length > 4,
    };
  }, [parsed]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }
    setError(null);
    try {
      await onSave(parsed.data);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장하지 못했습니다.");
    }
  };

  return (
    <Modal
      open={open}
      title={tracker ? "스택 수정" : "스택 만들기"}
      description="오늘 일정 안에서 같은 간격으로 스택이 충전됩니다."
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={(event) => void submit(event)}>
        <label>
          <span>이름</span>
          <input
            autoFocus
            maxLength={50}
            value={form.name}
            placeholder="예: 휴식, 물 마시기"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          <span>충전 시간</span>
          <select
            value={form.scheduleMode}
            onChange={(event) => setForm((current) => ({ ...current, scheduleMode: event.target.value as FormState["scheduleMode"] }))}
          >
            <option value="all_day">하루 전체 (00:00–24:00)</option>
            <option value="custom_time">시간 직접 지정</option>
          </select>
        </label>
        {form.scheduleMode === "custom_time" ? (
          <div className="stack-form-times">
            <label>
              <span>시작</span>
              <input inputMode="numeric" value={form.startTime} placeholder="04:00" onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
            </label>
            <label>
              <span>종료</span>
              <input inputMode="numeric" value={form.endTime} placeholder="24:00" onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
            </label>
          </div>
        ) : null}
        <label>
          <span>하루 충전 횟수</span>
          <input type="number" min={1} max={200} inputMode="numeric" value={form.totalCharges} onChange={(event) => setForm((current) => ({ ...current, totalCharges: event.target.value }))} />
        </label>
        {preview ? (
          <div className="stack-preview" aria-live="polite">
            <strong>약 {preview.interval}마다 +1</strong>
            <span>{preview.times.join(" · ")}{preview.omitted ? " · …" : ""}</span>
          </div>
        ) : null}
        {error ? <p className="dialog-error state-message error compact">{error}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>취소</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? "저장 중" : "저장"}</button>
        </div>
      </form>
    </Modal>
  );
}

