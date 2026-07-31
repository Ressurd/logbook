"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { DateNavigator } from "./DateNavigator";
import { LogComposer } from "./LogComposer";
import { LogEntryList } from "./LogEntryList";
import { AppShell } from "@/components/layout/AppShell";
import { updateLogEntry } from "@/features/logbook/api/updateLogEntry";
import { softDeleteLogEntry } from "@/features/logbook/api/softDeleteLogEntry";
import type { LogEntry } from "@/features/logbook/model/logEntry.types";
import { getErrorMessage } from "@/features/logbook/utils/format";
import { waitForWriteOrQueue } from "@/features/logbook/utils/writeQueue";
import { useAuth } from "@/hooks/useAuth";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useDailyStackEvents } from "@/hooks/useDailyStackEvents";
import { mergeTimelineEntries } from "@/features/timeline/timeline";

export function HomeScreen({ selectedDate }: { selectedDate: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { entries, setEntries, metadata, loading, error } = useDailyLogs(
    user!.uid,
    selectedDate,
  );
  const stackState = useDailyStackEvents(user!.uid, selectedDate);
  const timelineEntries = mergeTimelineEntries(entries, stackState.events);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [recentlyCreatedIds, setRecentlyCreatedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const animationTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(
    () => () => {
      for (const timer of animationTimers.current.values()) clearTimeout(timer);
      animationTimers.current.clear();
    },
    [],
  );

  const markEntryAsCreated = useCallback((id: string) => {
    setRecentlyCreatedIds((current) => new Set(current).add(id));
    const previousTimer = animationTimers.current.get(id);
    if (previousTimer) clearTimeout(previousTimer);
    const timer = setTimeout(() => {
      setRecentlyCreatedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      animationTimers.current.delete(id);
    }, 3_500);
    animationTimers.current.set(id, timer);
  }, []);

  const changeDate = (date: string) => {
    router.replace(`/?date=${encodeURIComponent(date)}`);
  };

  const update = async (entry: LogEntry, content: string) => {
    setMutationError(null);
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id
          ? { ...item, content, updatedAt: new Date(), hasPendingWrites: true }
          : item,
      ),
    );

    const rollback = () => {
      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id &&
          item.content === content &&
          item.hasPendingWrites
            ? entry
            : item,
        ),
      );
    };

    try {
      const outcome = await waitForWriteOrQueue(
        updateLogEntry(user!.uid, entry.id, content),
        navigator.onLine ? undefined : 0,
      );
      if (outcome.status === "queued") {
        void outcome.completion.catch((lateError) => {
          rollback();
          setMutationError(
            getErrorMessage(lateError, "수정 동기화에 실패해 원래 내용으로 복구했습니다."),
          );
        });
      }
    } catch (updateError) {
      rollback();
      throw updateError;
    }
  };

  const remove = async (entry: LogEntry) => {
    setMutationError(null);
    setEntries((current) => current.filter((item) => item.id !== entry.id));

    const rollback = () => {
      setEntries((current) => {
        if (current.some((item) => item.id === entry.id)) return current;
        return [...current, entry].sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        );
      });
    };

    try {
      const outcome = await waitForWriteOrQueue(
        softDeleteLogEntry(user!.uid, entry.id),
        navigator.onLine ? undefined : 0,
      );
      if (outcome.status === "queued") {
        void outcome.completion.catch((lateError) => {
          rollback();
          setMutationError(
            getErrorMessage(lateError, "삭제 동기화에 실패해 기록을 복구했습니다."),
          );
        });
      }
    } catch (deleteError) {
      rollback();
      throw deleteError;
    }
  };

  return (
    <AppShell>
      <DateNavigator date={selectedDate} onChange={changeDate} />
      <LogComposer uid={user!.uid} onEntryCreated={markEntryAsCreated} />
      {mutationError ? (
        <p className="state-message error compact" aria-live="polite">
          {mutationError}
        </p>
      ) : null}
      <div className="list-heading">
        <h2>기록 {loading || stackState.loading ? "" : timelineEntries.length.toLocaleString("ko-KR")}</h2>
        {metadata.hasPendingWrites || stackState.metadata.hasPendingWrites ? (
          <span className="sync-note">동기화 대기 중</span>
        ) : metadata.fromCache ? (
          <span className="sync-note">캐시에서 표시 중</span>
        ) : null}
      </div>
      <LogEntryList
        entries={timelineEntries}
        recentlyCreatedIds={recentlyCreatedIds}
        loading={loading || stackState.loading}
        error={error ?? stackState.error}
        onUpdate={update}
        onDelete={remove}
      />
    </AppShell>
  );
}
