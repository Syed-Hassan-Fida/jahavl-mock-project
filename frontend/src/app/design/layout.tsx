import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design system",
  description: "Buttons, fields, cards, badges, and dialogs used across the JAH Audio interface.",
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
