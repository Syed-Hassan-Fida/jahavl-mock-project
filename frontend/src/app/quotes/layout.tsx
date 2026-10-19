import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const instant = false;

export default function QuotesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
