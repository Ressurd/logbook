"use client";

import { Modal } from "@/components/common/Modal";

export function DeleteLogDialog({
  open,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Modal
      open={open}
      title="이 기록을 삭제할까요?"
      description="목록과 검색에서 사라집니다. 이번 버전에서는 복원할 수 없습니다."
      onClose={onClose}
    >
      {error ? (
        <p className="form-error dialog-error" aria-live="polite">
          {error}
        </p>
      ) : null}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="danger-button"
          disabled={deleting}
          onClick={() => void onConfirm()}
        >
          {deleting ? "삭제 중" : "삭제"}
        </button>
      </div>
    </Modal>
  );
}
