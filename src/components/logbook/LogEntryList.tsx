import { NotebookPen } from "lucide-react";

import { LogEntryItem } from "./LogEntryItem";
import type { LogEntry } from "@/features/logbook/model/logEntry.types";

export function LogEntryList({
  entries,
  loading,
  error,
  onUpdate,
  onDelete,
}: {
  entries: LogEntry[];
  loading: boolean;
  error: string | null;
  onUpdate: (entry: LogEntry, content: string) => Promise<void>;
  onDelete: (entry: LogEntry) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="entry-list" aria-label="기록을 불러오는 중" aria-busy="true">
        {[0, 1, 2].map((item) => (
          <div key={item} className="entry-skeleton">
            <span />
            <p />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="state-message error">{error}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <NotebookPen size={25} aria-hidden="true" />
        <p>아직 기록이 없습니다.</p>
        <span>떠오른 생각을 위 입력창에 바로 남겨보세요.</span>
      </div>
    );
  }

  return (
    <section className="entry-list" aria-label="시간순 기록 목록">
      {entries.map((entry) => (
        <LogEntryItem
          key={entry.id}
          entry={entry}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}
