import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-wordmark",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NoSinglePoint",
  description: "How centralized are the networks we call decentralized?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
