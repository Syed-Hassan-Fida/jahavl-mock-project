"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money } from "@/lib/api";

const CABINET_MM = 500;

export function WallPlanner({ minCabinet, maxCabinet }: { minCabinet: number; maxCabinet: number }) {
  const [widthFt, setWidthFt] = useState(16);
  const [heightFt, setHeightFt] = useState(9);

  const plan = useMemo(() => {
    const columns = Math.max(1, Math.round((widthFt * 304.8) / CABINET_MM));
    const rows = Math.max(1, Math.round((heightFt * 304.8) / CABINET_MM));
    const cabinets = columns * rows;
    return {
      columns,
      rows,
      cabinets,
      minimum: cabinets * minCabinet,
      maximum: cabinets * maxCabinet,
    };
  }, [widthFt, heightFt, minCabinet, maxCabinet]);

  const shownColumns = Math.min(plan.columns, 20);
  const shownRows = Math.min(plan.rows, 12);

  return (
    <section className="mt-14 overflow-hidden rounded-3xl border border-line bg-paper">
      <div className="grid lg:grid-cols-[1fr_1fr]">
        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-copper">WALL PLANNER</p>
          <h2 className="mt-2 text-4xl">Start from the room.</h2>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Suggested columns, rows, and cabinets for a 500 mm module, plus a sample minimum and maximum cost. It is a planning aid, not a quote.
          </p>
          <div className="mt-6 grid gap-5">
            <Slider label="Width" value={widthFt} min={8} max={40} unit="ft" onChange={setWidthFt} />
            <Slider label="Height" value={heightFt} min={6} max={24} unit="ft" onChange={setHeightFt} />
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Suggested columns" value={String(plan.columns)} />
            <Stat label="Suggested rows" value={String(plan.rows)} />
            <Stat label="Suggested cabinets" value={String(plan.cabinets)} />
          </dl>
          {minCabinet > 0 && maxCabinet > 0 ? (
            <>
              <dl className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
                <Stat label="Minimum cost" value={money(plan.minimum)} compact />
                <Stat label="Maximum cost" value={money(plan.maximum)} compact />
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-mist">
                Sample range. Minimum uses the least expensive cabinet, maximum the most expensive. Not the live jahavl.com list.
              </p>
            </>
          ) : null}
          <Link
            href={`/contact?interest=LED&note=${encodeURIComponent(`${widthFt} ft × ${heightFt} ft. Suggested ${plan.columns} columns × ${plan.rows} rows, ${plan.cabinets} cabinets of 500 mm. Sample cost ${money(plan.minimum)} to ${money(plan.maximum)}.`)}`}
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream hover:bg-black"
          >
            Request this wall
          </Link>
        </div>
        <div className="flex min-w-0 items-center overflow-hidden bg-night p-4 sm:p-8">
          <div
            className="grid w-full min-w-0 gap-1"
            style={{ gridTemplateColumns: `repeat(${shownColumns}, minmax(0, 1fr))` }}
            aria-hidden
          >
            {Array.from({ length: shownColumns * shownRows }, (_, index) => (
              <span key={index} className="aspect-square rounded-[2px] bg-[#d7e4f2]/80" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      <span className="flex items-baseline justify-between">
        {label}
        <span className="display text-3xl font-semibold tabular-nums">
          {value}
          <span className="ml-1 text-base text-mist">{unit}</span>
        </span>
      </span>
      <input
        className="mt-3 w-full accent-ink"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl bg-foam px-3 py-3">
      <dt className="text-xs text-mist">{label}</dt>
      <dd className={`display mt-1 break-words tabular-nums leading-none ${compact ? "text-lg sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{value}</dd>
    </div>
  );
}
