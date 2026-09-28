import type { LayerStatus } from "../model/types";

const STATUS_LABEL: Readonly<Record<LayerStatus, string>> = {
  disabled: "выключен",
  loading: "loading",
  success: "success",
  error: "error",
};

export function StatusPill({
  status,
  testId,
}: {
  readonly status: LayerStatus;
  readonly testId?: string;
}) {
  return (
    <span className={`status-pill status-pill--${status}`} data-testid={testId}>
      <span className="status-pill__dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
