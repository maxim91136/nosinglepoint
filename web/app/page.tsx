"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function Home() {
  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#05050c",
      }}
    >
      <Scene />

      <div
        style={{
          position: "absolute",
          top: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          color: "#e8e6f0",
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
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
    </main>
  );
}
