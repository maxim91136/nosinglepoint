import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-wordmark",
  display: "swap",
});

const TITLE = "NoSinglePoint: Bitcoin and Tor decentralization by hosting provider";
const DESCRIPTION =
  "Interactive 3D map of how concentrated Bitcoin nodes, mining pools and Tor relays really are across hosting providers (ASNs). Daily snapshots, Nakamoto coefficient and HHI, open data.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nosinglepoint.com"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://nosinglepoint.com",
    siteName: "NoSinglePoint",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
