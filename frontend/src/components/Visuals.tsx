import type { LineKey } from "@/lib/copy";

function tone(index: number, seed: number) {
  const x = index % 16;
  const y = Math.floor(index / 16);
  const glow = Math.max(0, 1 - Math.hypot(x - (4 + seed), y - (2.5 + (seed % 3))) / 7.5);
  const edge = Math.min(1, Math.hypot(x - (11 - seed), y - 6) / 10);
  const alpha = 0.18 + glow * 0.82;
  const warm = Math.round(255 - edge * 90);
  const cool = Math.round(150 + edge * 80 - glow * 40);
  return `rgba(${warm}, ${Math.round(170 + glow * 50)}, ${cool}, ${alpha.toFixed(2)})`;
}

export function LedWall({ className = "", seed = 1 }: { className?: string; seed?: number }) {
  return (
    <div className={`led ${className}`} aria-hidden>
      <div className="led__screen">
        {Array.from({ length: 144 }, (_, index) => (
          <i key={index} style={{ background: tone(index, seed) }} />
        ))}
      </div>
    </div>
  );
}

export function LightWash({ className = "", seed = 0 }: { className?: string; seed?: number }) {
  return (
    <div className={`wash aspect-video ${className}`} aria-hidden style={{ transform: `scaleX(${seed % 2 === 0 ? 1 : -1})` }}>
      <span className="wash__beam wash__beam--a" />
      <span className="wash__beam wash__beam--b" />
      <span className="wash__beam wash__beam--c" />
    </div>
  );
}

export function LineArray({ className = "", seed = 0 }: { className?: string; seed?: number }) {
  const sets = [
    ["46%", "72%", "88%", "64%"],
    ["70%", "48%", "90%", "58%"],
    ["55%", "84%", "62%", "78%"],
  ];
  const heights = sets[seed % sets.length];
  return (
    <div className={`array aspect-video px-8 py-6 ${className}`} aria-hidden>
      {heights.map((height, index) => (
        <span key={index} style={{ height }} />
      ))}
    </div>
  );
}

export function LineArt({ slug, className = "", seed = 1 }: { slug: string; className?: string; seed?: number }) {
  if (slug === "lighting") return <LightWash className={className} seed={seed} />;
  if (slug === "audio") return <LineArray className={className} seed={seed} />;
  return <LedWall className={className} seed={seed} />;
}

export function ProductPhoto({
  src,
  alt,
  fallback = "led",
  className = "",
  fill = false,
}: {
  src?: string | null;
  alt: string;
  fallback?: string;
  className?: string;
  fill?: boolean;
}) {
  const frame = `product-stage relative overflow-hidden bg-[#2a313b] ${fill ? "h-full" : "aspect-square"} ${className}`;

  if (!src) {
    return (
      <div className={frame}>
        <LineArt slug={fallback} className="art-flush h-full rounded-none" />
      </div>
    );
  }

  return (
    <div className={frame}>
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain p-3 md:p-4" />
    </div>
  );
}

export function isLine(slug: string): slug is LineKey {
  return slug === "led" || slug === "lighting" || slug === "audio";
}
