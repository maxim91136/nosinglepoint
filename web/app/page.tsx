export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        background: "#0a0a12",
        color: "#e8e6f0",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", letterSpacing: "0.02em" }}>NoSinglePoint</h1>
      <p style={{ color: "#9a94b0", maxWidth: "32rem" }}>
        How centralized are the networks we call decentralized? Data pipeline is live.
        Visualization coming soon.
      </p>
    </main>
  );
}
