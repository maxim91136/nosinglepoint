import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NoSinglePoint",
  description: "How centralized are the networks we call decentralized?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflow: "hidden" }}>{children}</body>
    </html>
  );
}
