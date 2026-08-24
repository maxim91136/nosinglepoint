"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { COLOR_BITCOIN, COLOR_TOR, COLOR_LINK } from "./colors";
import type { NetworkData } from "./networkData";
import ScoreTable from "./ScoreTable";
import RelatedProjects from "./RelatedProjects";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const LEGEND_NODES = [
  { color: COLOR_BITCOIN, label: "Bitcoin node cluster" },
  { color: COLOR_TOR, label: "Tor relay cluster" },
];

export default function Home() {
  const [data, setData] = useState<NetworkData | null>(null);

  useEffect(() => {
    fetch("/data/network.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <main style={{ background: "#05050c" }}>
      <section
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Scene data={data} />

        {/* Canopy shadow: frames the scene as a clearing glimpsed from
            beneath the jungle roof, rather than open sky. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(2,4,3,0.75) 0%, rgba(2,4,3,0) 45%), radial-gradient(ellipse 70% 40% at 50% 100%, rgba(2,4,3,0.5) 0%, rgba(2,4,3,0) 55%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="hero-title"
          style={{
            position: "absolute",
            top: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            color: "#e8e6f0",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none",
            padding: "0 1rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.75rem",
              letterSpacing: "0.02em",
              margin: 0,
              textShadow: "0 2px 12px rgba(5,5,12,0.9), 0 0 4px rgba(5,5,12,0.9)",
            }}
          >
            NoSinglePoint
          </h1>
          <p
            style={{
              color: "#c9c4dc",
              margin: "0.4rem 0 0",
              fontSize: "0.95rem",
              textShadow: "0 2px 10px rgba(5,5,12,0.9), 0 0 4px rgba(5,5,12,0.9)",
            }}
          >
            How centralized are the networks we call decentralized?
          </p>
        </div>

        <div
          className="legend-box"
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            background: "rgba(20,18,32,0.7)",
            border: "1px solid #3a3450",
            borderRadius: "0.4rem",
            padding: "0.6rem 0.85rem",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.8rem",
            color: "#c9c4dc",
            maxWidth: "min(16rem, calc(100vw - 2rem))",
          }}
        >
          {LEGEND_NODES.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "0.65rem",
                  height: "0.65rem",
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 6px ${item.color}`,
                  flexShrink: 0,
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                width: "0.9rem",
                height: "2px",
                background: COLOR_LINK,
                boxShadow: `0 0 6px ${COLOR_LINK}`,
                flexShrink: 0,
              }}
            />
            <span>ASN hosts both — brighter = more dominant</span>
          </div>
          <div className="legend-hint" style={{ marginTop: "0.15rem", color: "#8a84a0", fontSize: "0.72rem" }}>
            Node size = node/relay count per ASN
          </div>
        </div>

        <div
          className="scroll-hint"
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#726c86",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.75rem",
            pointerEvents: "none",
          }}
        >
          ↓ scores
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 640px) {
          .hero-title h1 {
            font-size: 1.3rem !important;
          }
          .hero-title p {
            font-size: 0.82rem !important;
          }
          .legend-box {
            font-size: 0.7rem !important;
            padding: 0.5rem 0.65rem !important;
            max-width: min(11.5rem, 52vw) !important;
            bottom: 0.75rem !important;
          }
          .legend-hint {
            display: none;
          }
          .scroll-hint {
            display: none;
          }
        }
      `}</style>

      {data && <ScoreTable data={data} />}
      <RelatedProjects />
    </main>
  );
}
