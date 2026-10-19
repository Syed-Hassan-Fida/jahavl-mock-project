type Name = "trash" | "pencil" | "plus" | "check" | "paperclip" | "send" | "bell" | "search" | "x" | "download" | "back";

const paths: Record<Name, string> = {
  trash: "M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12",
  pencil: "M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5zM13 7.5l3.5 3.5",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 9.5 17 19 7",
  paperclip: "M8 12.5 14.5 6a3 3 0 0 1 4.2 4.2l-8 8a4.2 4.2 0 0 1-6-6l7.8-7.8",
  send: "M5 12h14M13 6l6 6-6 6",
  bell: "M6 16h12l-1.2-2.2V10a4.8 4.8 0 0 0-9.6 0v3.8L6 16zM10 18a2 2 0 0 0 4 0",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l4 4",
  x: "M6 6l12 12M18 6 6 18",
  download: "M12 4v10m0 0 4-4m-4 4-4-4M5 19h14",
  back: "M14 6 8 12l6 6",
};

export function Icon({ name, className = "h-4 w-4" }: { name: Name; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

export function IconButton({
  label,
  name,
  onClick,
  type = "button",
  disabled,
  tone = "quiet",
}: {
  label: string;
  name: Name;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  tone?: "quiet" | "danger" | "solid";
}) {
  const toneClass = tone === "solid"
    ? "bg-ink text-cream hover:bg-ink/90"
    : tone === "danger"
      ? "text-copper hover:bg-copper/10"
      : "text-ink hover:bg-foam";

  return (
    <button type={type} aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full disabled:opacity-50 ${toneClass}`}>
      <Icon name={name} />
    </button>
  );
}
