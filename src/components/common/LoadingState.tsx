import { LoaderCircle } from "lucide-react";

export function LoadingState({
  label,
  fullScreen = false,
}: {
  label: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={fullScreen ? "screen-center" : "loading-inline"}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle aria-hidden="true" className="spin" size={18} />
      <span>{label}</span>
    </div>
  );
}
