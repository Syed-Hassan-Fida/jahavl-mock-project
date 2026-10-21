export type IconName =
  | "trash"
  | "pencil"
  | "plus"
  | "check"
  | "paperclip"
  | "send"
  | "bell"
  | "search"
  | "x"
  | "download"
  | "back"
  | "grid"
  | "file"
  | "ticket"
  | "message"
  | "menu"
  | "user"
  | "sliders"
  | "people"
  | "tag"
  | "task"
  | "note"
  | "card";

const paths: Record<IconName, string> = {
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
  grid: "M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z",
  file: "M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM14 4v5h5",
  ticket: "M5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z",
  message: "M5 6h14v10H8l-3 3z",
  menu: "M5 7h14M5 12h14M5 17h14",
  user: "M12 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 12zM6 19.2c.8-2.4 3-3.7 6-3.7s5.2 1.3 6 3.7",
  sliders: "M4 8h16M4 16h16M9 6v4M15 14v4",
  people: "M9 11a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 9 11zM16 10.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM4.5 18c.6-2.2 2.4-3.4 4.5-3.4s3.9 1.2 4.5 3.4M14 14.6c1.6.2 2.9 1.1 3.5 3.4",
  tag: "M4 12V5h7l9 9-7 7zM8.5 8.5h.01",
  task: "M8 6h11M8 12h11M8 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  note: "M7 4h8l4 4v12H7zM15 4v4h4M9 12h6M9 16h4",
  card: "M4 8h16v10H4zM4 11h16M8 15h3",
};

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
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
  name: IconName;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  tone?: "quiet" | "danger" | "solid";
}) {
  const toneClass = tone === "solid"
    ? "bg-ink text-cream hover:bg-black"
    : tone === "danger"
      ? "text-copper hover:bg-[#f8efe4]"
      : "text-ink hover:bg-foam";

  return (
    <button type={type} aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50 ${toneClass}`}>
      <Icon name={name} />
    </button>
  );
}
