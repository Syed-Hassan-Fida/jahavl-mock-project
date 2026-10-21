import Link from "next/link";
import type { SeriesSummary } from "@/lib/api";

export function SeriesGrid({ series, fallback }: { series: SeriesSummary[]; fallback: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4">
      {series.map((item) => (
        <li key={item.slug} className="min-w-0">
          <Link
            href={`/series/${item.slug}`}
            className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl bg-[#2a313b] ring-1 ring-white/10"
          >
            {item.image ? (
              <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105 sm:p-6" />
            ) : (
              <span aria-hidden className="absolute inset-0 grid place-items-center text-xs font-semibold tracking-[0.16em] text-haze">{fallback.toUpperCase()}</span>
            )}
            <span className="relative bg-gradient-to-t from-night via-night/85 to-transparent p-3 sm:p-5">
              <span className="block font-display text-2xl leading-tight text-cream sm:text-4xl">{item.name}</span>
              <span className="mt-1 line-clamp-2 block text-xs leading-snug text-haze sm:text-sm">{item.summary ?? `${item.product_count} products`}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
