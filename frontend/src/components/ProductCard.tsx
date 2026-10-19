import Link from "next/link";
import { ProductPhoto } from "@/components/Visuals";
import { money, type ProductSummary } from "@/lib/api";

export function ProductCard({ product, fallback }: { product: ProductSummary; fallback: string }) {
  const chips = [product.pitch, product.brightness, product.refresh_hz ? `${product.refresh_hz.toLocaleString()} Hz` : null].filter(Boolean);

  return (
    <Link href={`/products/${product.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-paper ring-1 ring-line transition-shadow duration-300 hover:shadow-[0_18px_40px_rgb(12_14_18/0.12)]">
      <ProductPhoto src={product.image} alt={product.name} fallback={fallback} className="rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        {product.series?.name ? <p className="text-[11px] font-semibold tracking-[0.16em] text-copper">{product.series.name.toUpperCase()}</p> : null}
        <h3 className="mt-1 text-3xl">{product.name}</h3>
        {chips.length ? <p className="mt-2 text-sm text-mist">{chips.join(" · ")}</p> : null}
        <p className="mt-auto flex items-baseline justify-between gap-3 pt-5">
          <span className="text-lg font-semibold tabular-nums">{money(product.list_price)}</span>
          <span className="text-[11px] font-semibold tracking-[0.16em] text-mist">SAMPLE</span>
        </p>
      </div>
    </Link>
  );
}
