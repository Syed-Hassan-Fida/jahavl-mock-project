export const lines = {
  led: {
    kicker: "Video",
    headline: "Walls that match the camera.",
    line: "Native 16:9 cabinets for rooms that are filmed as often as they are filled.",
  },
  lighting: {
    kicker: "Light",
    headline: "One house line for the platform.",
    line: "Wash, spot, and color, sized for a sanctuary and a tour.",
  },
  audio: {
    kicker: "Sound",
    headline: "Speech first, then music.",
    line: "Arrays and stage monitors from the same maker as the wall and the lights.",
  },
} as const;

export type LineKey = keyof typeof lines;

const tokens = new Set(["led", "jhd", "je", "jw", "jla", "jda", "jx", "hl"]);

export function lineFor(slug: string) {
  if (slug === "led" || slug === "lighting" || slug === "audio") {
    return lines[slug];
  }
  const headline = slug
    .split("-")
    .filter(Boolean)
    .map((word) => (tokens.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
  return { kicker: "Catalog", headline: headline || "Catalog", line: "Series in the current catalog." };
}

const preferred: Record<string, string[]> = {
  led: ["j-series", "je-series", "jw-series", "jhd-series"],
  lighting: ["intelligent-series", "versa-series", "hl-series"],
  audio: ["jla-series", "jx-series", "jda-series"],
};

export function sortSeries<T extends { slug: string }>(category: string, series: T[]) {
  const order = preferred[category] ?? [];
  return [...series].sort((a, b) => {
    const aLast = a.slug.includes("accessor");
    const bLast = b.slug.includes("accessor");
    if (aLast !== bLast) return aLast ? 1 : -1;
    const ai = order.indexOf(a.slug);
    const bi = order.indexOf(b.slug);
    if (ai === -1 && bi === -1) return a.slug.localeCompare(b.slug);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function categoryHref(slug: string) {
  return slug === "led" ? "/led" : `/catalog/${slug}`;
}

export function viewLabel(slug: string, name: string) {
  if (slug === "led") return "View LED walls";
  if (slug === "lighting") return "View lighting";
  if (slug === "audio") return "View audio";
  return `View ${name}`;
}

export const company = {
  phone: "1-772-202-0034",
  phoneHref: "tel:+17722020034",
  email: "info@jahavl.com",
  street: "5809 Sunset Blvd",
  city: "Fort Pierce, FL 34982",
};
