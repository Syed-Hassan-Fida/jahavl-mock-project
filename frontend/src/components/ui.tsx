"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/Icons";

const statusTone: Record<string, string> = {
  draft: "bg-foam text-ink",
  requested: "bg-[#f8efe4] text-[#8a3e0c]",
  approved: "bg-[#e7f3ea] text-[#176b38]",
  paid: "bg-ink text-cream",
  pending: "bg-[#f8efe4] text-[#8a3e0c]",
  open: "bg-[#e8eef8] text-[#1e3a6e]",
  closed: "bg-foam text-ink",
  resolved: "bg-[#e7f3ea] text-[#176b38]",
  wishlist: "bg-foam text-ink",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusTone[status] ?? "bg-foam text-ink"}`}>{status.replaceAll("_", " ")}</span>;
}

export function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="panel flex h-full min-w-0 flex-col p-5">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-mist">{label.toUpperCase()}</p>
      <p className="mt-4 text-[clamp(1.6rem,2.4vw,2.25rem)] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-mist">{hint}</p>
    </article>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="panel border-dashed px-6 py-14 text-center">
      <p className="font-display text-4xl text-ink">{title}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mist">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Banner({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles = {
    info: "border-line bg-white text-ink",
    error: "border-[#e7c4b0] bg-[#fbf3ee] text-[#8c3f0e]",
    success: "border-[#c9e0d0] bg-[#f3faf5] text-[#176b38]",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${styles[tone]}`}>
      {children}
    </p>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end p-0 sm:place-items-center sm:p-6">
      <button type="button" className="modal-backdrop absolute inset-0 bg-ink/50" aria-label="Close dialog" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal-panel panel relative z-10 w-full max-w-md rounded-t-3xl p-6 outline-none sm:rounded-[20px]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-4xl">{title}</h2>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink hover:bg-foam" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="mt-4 text-sm leading-relaxed text-mist">{children}</div>
      </div>
    </div>
  );
}

export type AttachmentFile = { name: string; bytes?: number | null };

export function formatBytes(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentCard({
  file,
  onOpen,
  onRemove,
}: {
  file: AttachmentFile;
  onOpen?: () => void;
  onRemove?: () => void;
}) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "file";
  const size = formatBytes(file.bytes);
  return (
    <div className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-ink">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-foam text-[10px] font-semibold tracking-wide text-ink" aria-hidden>{extension.slice(0, 4).toUpperCase()}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{file.name}</span>
        <span className="block text-xs text-mist">{size || "File"}</span>
      </span>
      {onOpen ? <button type="button" className="min-h-11 px-2 text-sm font-semibold text-copper" onClick={onOpen}>Open</button> : null}
      {onRemove ? <button type="button" className="min-h-11 px-2 text-sm font-semibold" onClick={onRemove}>Remove</button> : null}
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(total, current * pageSize);
  const control =
    "inline-flex h-9 items-center justify-center rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-foam disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm tabular-nums text-mist">{total === 0 ? "0 results" : `${start}–${end} of ${total}`}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white pl-3 pr-1.5 text-sm text-mist">
          <span className="whitespace-nowrap">Rows</span>
          <select
            className="h-7 min-w-[3.25rem] cursor-pointer appearance-none border-0 bg-transparent py-0 pr-5 text-sm font-medium text-ink outline-none focus:outline-none focus-visible:outline-none"
            style={{ backgroundImage: "none" }}
            value={pageSize}
            onChange={(event) => {
              onPageSize(Number(event.target.value));
              onPage(1);
            }}
            aria-label="Rows per page"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button type="button" className={`${control} min-w-9 px-2.5`} disabled={current <= 1} onClick={() => onPage(current - 1)} aria-label="Previous page">
            Prev
          </button>
          <span className="min-w-[4.5rem] px-2 text-center text-sm tabular-nums text-mist" aria-live="polite">
            {current} <span className="opacity-40">/</span> {pages}
          </span>
          <button type="button" className={`${control} min-w-9 px-2.5`} disabled={current >= pages} onClick={() => onPage(current + 1)} aria-label="Next page">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export function toast(message: string, tone: "success" | "error" | "info" = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jah-toast", { detail: { message, tone } }));
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p>{body}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
