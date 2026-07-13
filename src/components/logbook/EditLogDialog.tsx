"use client";

import { useState, type FormEvent } from "react";

import { Modal } from "@/components/common/Modal";
import { logContentSchema } from "@/features/logbook/schemas/logEntry.schema";
import { formatCharacterCount } from "@/features/logbook/utils/format";

export function EditLogDialog({
  open,
  initialContent,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  initialContent: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = logContentSchema.safeParse(content);
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "내용을 확인해주세요.");
      return;
    }
    await onSave(result.data);
  };

  return (
    <Modal
      open={open}
      title="기록 수정"
      description="내용을 고친 뒤 저장해주세요."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={submit}>
        <label htmlFor="edit-content" className="sr-only">
          수정할 기록 내용
        </label>
        <textarea
          id="edit-content"
          value={content}
          maxLength={10_000}
          rows={7}
          autoFocus
          onChange={(event) => {
            setContent(event.target.value);
            setValidationError(null);
          }}
        />
        <div className="dialog-meta">
          <p className="form-error" aria-live="polite">
            {validationError ?? error}
          </p>
          <span className="character-count">{formatCharacterCount(content)}</span>
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "저장 중" : "수정 저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
