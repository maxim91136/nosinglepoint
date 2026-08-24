import pkg from "../package.json";

const PROJECTS = [
  {
    name: "SatoshisGrid",
    url: "https://satoshisgrid.com",
    description: "Bitcoin network visualization",
  },
  {
    name: "NotSoDeFi",
    url: "https://notsodefi.com",
    description: "DeFi decentralization framework",
  },
];

export default function RelatedProjects() {
  return (
    <section
      style={{
        background: "#060509",
        borderTop: "1px solid #1c1928",
        padding: "2.5rem 1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "44rem", margin: "0 auto" }}>
        <div style={{ fontSize: "0.72rem", color: "#57516b", letterSpacing: "0.05em", marginBottom: "0.9rem" }}>
          PART OF A SERIES ON NETWORK DECENTRALIZATION
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {PROJECTS.map((p) => (
            <a
              key={p.url}
              href={p.url}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.15rem",
                flex: "1 1 14rem",
                padding: "0.85rem 1rem",
                border: "1px solid #262234",
                borderRadius: "0.4rem",
                textDecoration: "none",
                color: "#c9c4dc",
              }}
            >
              <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#e8e6f0" }}>{p.name}</span>
              <span style={{ fontSize: "0.78rem", color: "#8a84a0" }}>{p.description}</span>
            </a>
          ))}
        </div>

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid #1c1928",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "0.5rem",
            fontSize: "0.78rem",
            color: "#57516b",
          }}
        >
          <span>
            Built by{" "}
            <a href="https://github.com/maxim91136" style={{ color: "#8a84a0" }}>
              maxim91136
            </a>
          </span>
          <a href="https://github.com/maxim91136/nosinglepoint" style={{ color: "#8a84a0" }}>
            View source on GitHub
          </a>
          <a
            href={`https://github.com/maxim91136/nosinglepoint/releases/tag/v${pkg.version}`}
            style={{ color: "#8a84a0" }}
          >
            v{pkg.version}
          </a>
        </div>
      </div>
    </section>
  );
}
