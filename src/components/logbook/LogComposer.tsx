"use client";

import { Send } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { createLogEntry } from "@/features/logbook/api/createLogEntry";
import { logContentSchema } from "@/features/logbook/schemas/logEntry.schema";
import {
  formatCharacterCount,
  getErrorMessage,
} from "@/features/logbook/utils/format";
import { waitForWriteOrQueue } from "@/features/logbook/utils/writeQueue";

export function LogComposer({
  uid,
  onEntryCreated,
}: {
  uid: string;
  onEntryCreated?: (id: string) => void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) {
      return;
    }
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [content]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submittingRef.current) return;

    const parsed = logContentSchema.safeParse(content);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "내용을 확인해주세요.");
      textareaRef.current?.focus();
      return;
    }

    const submittedContent = content;
    submittingRef.current = true;
    setSubmitting(true);
    setMessage(null);
    try {
      const write = createLogEntry(uid, parsed.data);
      onEntryCreated?.(write.id);
      const outcome = await waitForWriteOrQueue(
        write.completion,
        navigator.onLine ? undefined : 0,
      );
      setContent((current) => (current === submittedContent ? "" : current));
      if (outcome.status === "queued") {
        setMessage("기록을 기기에 저장했습니다. 연결되면 동기화합니다.");
        void outcome.completion.catch((lateError) => {
          setContent((current) => {
            if (!current) return submittedContent;
            if (current === submittedContent) return current;
            return `${submittedContent}\n\n${current}`;
          });
          setMessage(
            getErrorMessage(
              lateError,
              "저장하지 못했습니다. 입력 내용을 다시 복구했습니다.",
            ),
          );
        });
      } else {
        setMessage("기록했습니다.");
      }
      textareaRef.current?.focus({ preventScroll: true });
    } catch (error) {
      setMessage(getErrorMessage(error, "저장하지 못했습니다. 입력 내용은 유지됩니다."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const desktopKeyboard = window.matchMedia("(pointer: fine)").matches;
    if (event.key === "Enter" && !event.shiftKey && desktopKeyboard) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <label htmlFor="log-content" className="sr-only">
        기록 내용
      </label>
      <textarea
        ref={textareaRef}
        id="log-content"
        value={content}
        maxLength={10_000}
        rows={2}
        placeholder="생각나는 내용을 입력하세요"
        onChange={(event) => {
          setContent(event.target.value);
          if (message) setMessage(null);
        }}
        onKeyDown={onKeyDown}
        aria-describedby="composer-help composer-message"
      />
      <div className="composer-footer">
        <div>
          <p id="composer-help" className="composer-help">
            PC: Enter 저장 · Shift + Enter 줄바꿈
          </p>
          <p id="composer-message" className="form-message" aria-live="polite">
            {message}
          </p>
        </div>
        <div className="composer-actions">
          <span className="character-count">{formatCharacterCount(content)}</span>
          <button
            className="primary-button"
            type="submit"
            disabled={submitting || !content.trim()}
          >
            <Send size={17} aria-hidden="true" />
            {submitting ? "저장 중" : "기록하기"}
          </button>
        </div>
      </div>
    </form>
  );
}
