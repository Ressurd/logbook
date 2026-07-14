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
import {
  MOBILE_ENTER_MODE_STORAGE_KEY,
  parseMobileEnterMode,
  type MobileEnterMode,
} from "@/features/logbook/utils/mobileEnterMode";
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
  const [mobileEnterMode, setMobileEnterMode] =
    useState<MobileEnterMode>("newline");
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
    let savedMode: string | null = null;
    try {
      savedMode = window.localStorage.getItem(MOBILE_ENTER_MODE_STORAGE_KEY);
    } catch {
      // 브라우저 저장소가 차단된 환경에서는 안전한 기본값을 유지합니다.
    }
    const timer = window.setTimeout(
      () => setMobileEnterMode(parseMobileEnterMode(savedMode)),
      0,
    );
    return () => window.clearTimeout(timer);
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
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    const desktopKeyboard = window.matchMedia(
      "(min-width: 768px) and (pointer: fine)",
    ).matches;
    if (!desktopKeyboard && mobileEnterMode === "newline") return;

    event.preventDefault();
    void submit();
  };

  const changeMobileEnterMode = (mode: MobileEnterMode) => {
    setMobileEnterMode(mode);
    try {
      window.localStorage.setItem(MOBILE_ENTER_MODE_STORAGE_KEY, mode);
    } catch {
      // 저장이 불가능해도 현재 화면에서는 선택한 동작을 유지합니다.
    }
    textareaRef.current?.focus({ preventScroll: true });
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
        enterKeyHint={mobileEnterMode === "submit" ? "send" : "enter"}
        placeholder="생각나는 내용을 입력하세요"
        onChange={(event) => {
          setContent(event.target.value);
          if (message) setMessage(null);
        }}
        onKeyDown={onKeyDown}
        aria-describedby="composer-help mobile-enter-mode-help composer-message"
      />
      <div className="composer-footer">
        <div className="composer-guidance">
          <p id="composer-help" className="composer-help desktop-composer-help">
            PC: Enter 저장 · Shift + Enter 줄바꿈
          </p>
          <div
            id="mobile-enter-mode-help"
            className="mobile-enter-mode"
            role="group"
            aria-label="모바일 Enter 키 동작"
          >
            <span>Enter</span>
            <div className="enter-mode-options">
              <button
                type="button"
                className={
                  mobileEnterMode === "submit"
                    ? "enter-mode-option active"
                    : "enter-mode-option"
                }
                aria-pressed={mobileEnterMode === "submit"}
                onClick={() => changeMobileEnterMode("submit")}
              >
                기록
              </button>
              <button
                type="button"
                className={
                  mobileEnterMode === "newline"
                    ? "enter-mode-option active"
                    : "enter-mode-option"
                }
                aria-pressed={mobileEnterMode === "newline"}
                onClick={() => changeMobileEnterMode("newline")}
              >
                줄바꿈
              </button>
            </div>
          </div>
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
