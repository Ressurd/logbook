"use client";

import { AlertTriangle, Clock3, Minus, Pencil, Plus, RefreshCw, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { StackTrackerForm } from "./StackTrackerForm";
import { createConsumeEvent } from "@/features/stacks/api/createConsumeEvent";
import { createStackTracker, deactivateStackTracker, updateStackTracker } from "@/features/stacks/api/writeStackTracker";
import type { StackTracker } from "@/features/stacks/model/stack.types";
import type { StackTrackerInput } from "@/features/stacks/schemas/stack.schema";
import {
  calculateChargedCount,
  calculateCurrentStack,
  formatChargeInterval,
  formatRemainingDuration,
  getKstPeriodDate,
  getNextChargeAt,
  minuteToTime,
} from "@/features/stacks/utils/stackCalculations";
import { formatKstTime } from "@/features/logbook/utils/date";
import { getErrorMessage } from "@/features/logbook/utils/format";
import { waitForWriteOrQueue } from "@/features/logbook/utils/writeQueue";
import { useStacks } from "./StackProvider";
import { useAuth } from "@/hooks/useAuth";
import { useDailyStackEvents } from "@/hooks/useDailyStackEvents";

export function StackTrackerScreen() {
  const { user } = useAuth();
  const { trackers, metadata, loading, error: providerError, reconcile } = useStacks();
  const [now, setNow] = useState(() => new Date());
  const periodDate = getKstPeriodDate(now);
  const { events, loading: eventsLoading, error: eventsError } = useDailyStackEvents(user!.uid, periodDate);
  const [editing, setEditing] = useState<StackTracker | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [busyTrackerId, setBusyTrackerId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mutationInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    void reconcile();
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [reconcile]);

  const consumedByTracker = useMemo(() => {
    const counts = new Map<string, number>();
    events.filter((event) => event.eventType === "consume").forEach((event) => counts.set(event.trackerId, (counts.get(event.trackerId) ?? 0) + 1));
    return counts;
  }, [events]);

  const save = async (input: StackTrackerInput) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    setMessage(null);
    try {
      if (editing) await updateStackTracker(user!.uid, editing.id, input);
      else await createStackTracker(user!.uid, input);
      setEditing(undefined);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const consume = async (tracker: StackTracker) => {
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    setBusyTrackerId(tracker.id);
    setMessage(null);
    try {
      const write = createConsumeEvent(user!.uid, tracker, new Date());
      const outcome = await waitForWriteOrQueue(write.completion, navigator.onLine ? undefined : 0);
      if (outcome.status === "queued") {
        setMessage("사용 기록을 이 기기에 저장했습니다. 연결되면 동기화됩니다.");
        void outcome.completion.catch(() => setMessage("사용 기록 동기화에 실패했습니다. 다시 눌러 기록해주세요."));
      }
    } catch (consumeError) {
      setMessage(getErrorMessage(consumeError, "사용 기록을 저장하지 못했습니다."));
    } finally {
      mutationInFlightRef.current = false;
      setBusyTrackerId(null);
    }
  };

  const deactivate = async (tracker: StackTracker) => {
    if (!window.confirm(`‘${tracker.name}’ 스택을 비활성화할까요? 기존 이벤트는 유지됩니다.`)) return;
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    setBusyTrackerId(tracker.id);
    try {
      await deactivateStackTracker(user!.uid, tracker.id);
    } catch (deactivateError) {
      setMessage(getErrorMessage(deactivateError, "비활성화하지 못했습니다."));
    } finally {
      mutationInFlightRef.current = false;
      setBusyTrackerId(null);
    }
  };

  return (
    <AppShell>
      <section className="page-heading">
        <div><p className="eyebrow">매일 다시 채우는 횟수</p><h1>스택</h1></div>
        <button type="button" className="primary-button" onClick={() => setEditing(null)}><Plus size={17} /> 만들기</button>
      </section>
      {providerError || eventsError ? <p className="state-message error compact">{providerError ?? eventsError}</p> : null}
      {message ? <p className="state-message compact" aria-live="polite">{message}</p> : null}
      {(loading || eventsLoading) && trackers.length === 0 ? <p className="state-message">스택을 불러오는 중입니다.</p> : null}
      {!loading && trackers.length === 0 ? (
        <div className="empty-state"><Zap size={26} /><p>활성 스택이 없습니다.</p><span>매일 쓸 수 있는 횟수를 일정하게 충전해보세요.</span></div>
      ) : (
        <section className="stack-grid" aria-label="활성 스택 목록">
          {trackers.map((tracker) => {
            const consumed = consumedByTracker.get(tracker.id) ?? 0;
            const charged = calculateChargedCount(tracker, periodDate, now);
            const current = calculateCurrentStack(tracker, periodDate, consumed, now);
            const next = getNextChargeAt(tracker, periodDate, now);
            return (
              <article key={tracker.id} className="stack-card">
                <header className="stack-card-header">
                  <div><h2>{tracker.name}</h2><span>{minuteToTime(tracker.startMinute)}–{minuteToTime(tracker.endMinute)} · {formatChargeInterval(tracker)} 간격</span></div>
                  <button type="button" className="entry-action" aria-label={`${tracker.name} 수정`} onClick={() => setEditing(tracker)}><Pencil size={16} /></button>
                </header>
                <div className="stack-value"><strong>{current}</strong><span>현재 스택</span></div>
                {current < 0 ? <p className="stack-warning"><AlertTriangle size={14} /> 충전량보다 {Math.abs(current)}회 더 사용했습니다.</p> : null}
                <dl className="stack-stats">
                  <div><dt>오늘 충전</dt><dd>{charged} / {tracker.totalCharges}</dd></div>
                  <div><dt>오늘 사용</dt><dd>{consumed}</dd></div>
                  <div><dt>다음 충전</dt><dd>{next ? `${formatKstTime(next)} · ${formatRemainingDuration(next, now)} 후` : "완료"}</dd></div>
                </dl>
                <div className="stack-actions">
                  <button type="button" className="primary-button stack-consume" disabled={busyTrackerId === tracker.id} onClick={() => void consume(tracker)}><Minus size={18} /> 1 사용</button>
                  <button type="button" className="text-button" disabled={busyTrackerId === tracker.id} onClick={() => void deactivate(tracker)}>비활성화</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
      <section className="stack-history" aria-labelledby="stack-history-title">
        <div className="list-heading"><h2 id="stack-history-title">오늘 이벤트 {events.length.toLocaleString("ko-KR")}</h2>{metadata.hasPendingWrites ? <span className="sync-note">동기화 대기 중</span> : null}</div>
        {events.length === 0 ? <p className="state-message compact">아직 스택 이벤트가 없습니다.</p> : events.map((event) => (
          <article className="stack-event-row" key={event.id}>
            <time dateTime={event.occurredAt.toISOString()}>{formatKstTime(event.occurredAt)}</time>
            <span className={event.amount > 0 ? "stack-event-charge" : "stack-event-consume"}>{event.amount > 0 ? <Zap size={14} /> : <Minus size={14} />}{event.trackerName} · {event.amount > 0 ? `+1 충전${event.chargeIndex ? ` #${event.chargeIndex}` : ""}` : "-1 사용"}</span>
            {event.hasPendingWrites ? <Clock3 size={13} aria-label="동기화 대기 중" /> : null}
          </article>
        ))}
      </section>
      <button type="button" className="sr-only" onClick={() => void reconcile()}><RefreshCw /> 스택 충전 기록 다시 동기화</button>
      {editing !== undefined ? <StackTrackerForm key={editing?.id ?? "new"} open tracker={editing} saving={saving} onClose={() => !saving && setEditing(undefined)} onSave={save} /> : null}
    </AppShell>
  );
}
