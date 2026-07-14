"use client";

import { Clock3, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { DeleteLogDialog } from "./DeleteLogDialog";
import { EditLogDialog } from "./EditLogDialog";
import type { LogEntry } from "@/features/logbook/model/logEntry.types";
import { formatKstTime } from "@/features/logbook/utils/date";
import { getErrorMessage } from "@/features/logbook/utils/format";

export function LogEntryItem({
  entry,
  justCreated,
  onUpdate,
  onDelete,
}: {
  entry: LogEntry;
  justCreated: boolean;
  onUpdate: (entry: LogEntry, content: string) => Promise<void>;
  onDelete: (entry: LogEntry) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (content: string) => {
    setBusy(true);
    setError(null);
    try {
      await onUpdate(entry, content);
      setEditing(false);
    } catch (updateError) {
      setError(getErrorMessage(updateError, "수정하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(entry);
      setDeleting(false);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "삭제하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={justCreated ? "log-entry just-created" : "log-entry"}>
      <div className="entry-time">
        <time dateTime={entry.createdAt.toISOString()}>
          {formatKstTime(entry.createdAt)}
        </time>
        {entry.hasPendingWrites ? (
          <span className="pending-label" title="동기화 대기 중">
            <Clock3 size={12} /> 대기 중
          </span>
        ) : null}
      </div>
      <p className="entry-content">{entry.content}</p>
      <div className="entry-actions">
        <button
          type="button"
          className="entry-action"
          aria-label={`${formatKstTime(entry.createdAt)} 기록 수정`}
          onClick={() => {
            setError(null);
            setEditing(true);
          }}
        >
          <Pencil size={15} />
          <span>수정</span>
        </button>
        <button
          type="button"
          className="entry-action delete"
          aria-label={`${formatKstTime(entry.createdAt)} 기록 삭제`}
          onClick={() => {
            setError(null);
            setDeleting(true);
          }}
        >
          <Trash2 size={15} />
          <span>삭제</span>
        </button>
      </div>
      {editing ? (
        <EditLogDialog
          open
          initialContent={entry.content}
          saving={busy}
          error={error}
          onClose={() => !busy && setEditing(false)}
          onSave={update}
        />
      ) : null}
      {deleting ? (
        <DeleteLogDialog
          open
          deleting={busy}
          error={error}
          onClose={() => !busy && setDeleting(false)}
          onConfirm={remove}
        />
      ) : null}
    </article>
  );
}
