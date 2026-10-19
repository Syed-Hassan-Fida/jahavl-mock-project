import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Request a quote from JAH Audio in Fort Pierce.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
