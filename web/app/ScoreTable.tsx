import type { NetworkData, NetworkNode, Side } from "./networkData";
import { COLOR_BITCOIN, COLOR_TOR, COLOR_LINK } from "./colors";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtAvg(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtPct(n: number): string {
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

// ---------- Highlights (KPI row) ----------

interface TopHost {
  name: string;
  count: number;
  share: number;
}

/** Best available label for a host: curated provider name, then category, then the raw ASN — never the bare word "Unknown". */
function hostLabel(node: NetworkNode): string {
  if (node.providerName) return node.providerName;
  if (node.category !== "Unknown") return node.category;
  return node.asn;
}

function topHost(nodes: NetworkNode[], side: Side, total: number): TopHost | null {
  let best: NetworkNode | null = null;
  let bestCount = 0;
  for (const n of nodes) {
    const count = side === "bitcoin" ? n.bitcoinCount : n.torCount;
    if (count > bestCount) {
      bestCount = count;
      best = n;
    }
  }
  if (!best) return null;
  return {
    name: hostLabel(best),
    count: bestCount,
    share: total > 0 ? (bestCount / total) * 100 : 0,
  };
}

function countDistinct(nodes: NetworkNode[], side: Side, key: "asn" | "country"): number {
  const set = new Set<string>();
  for (const n of nodes) {
    const count = side === "bitcoin" ? n.bitcoinCount : n.torCount;
    if (count <= 0) continue;
    const value = key === "asn" ? n.asn : n.country;
    if (key === "country" && value === "??") continue;
    set.add(value);
  }
  return set.size;
}

function StatTile({
  label,
  value,
  sub,
  dotColor,
}: {
  label: string;
  value: string;
  sub?: string;
  dotColor?: string;
}) {
  return (
    <div
      style={{
        padding: "0.9rem 1rem",
        border: "1px solid #262234",
        borderRadius: "0.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {dotColor && (
          <span
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ fontSize: "0.72rem", color: "#8a84a0" }}>{label}</span>
      </div>
      <div
        style={{
          fontSize: "1.05rem",
          fontWeight: 600,
          color: "#e8e6f0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.75rem", color: "#726c86" }}>{sub}</div>}
    </div>
  );
}

function Highlights({ data }: { data: NetworkData }) {
  const btcHost = topHost(data.nodes, "bitcoin", data.bitcoin.node_count);
  const torHost = topHost(data.nodes, "tor", data.tor.relay_count);
  const btcAsns = countDistinct(data.nodes, "bitcoin", "asn");
  const torAsns = countDistinct(data.nodes, "tor", "asn");
  const btcCountries = countDistinct(data.nodes, "bitcoin", "country");
  const torCountries = countDistinct(data.nodes, "tor", "country");

  const topConnection = data.connections[0];
  const topConnectionNode = topConnection
    ? data.nodes.find((n) => n.asn === topConnection.asn)
    : undefined;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
        gap: "0.75rem",
        marginTop: "1.4rem",
      }}
    >
      {btcHost && (
        <StatTile
          label="Largest Bitcoin host"
          value={btcHost.name}
          sub={`${fmt(btcHost.count)} nodes · ${fmtPct(btcHost.share)} share`}
          dotColor={COLOR_BITCOIN}
        />
      )}
      {torHost && (
        <StatTile
          label="Largest Tor host"
          value={torHost.name}
          sub={`${fmt(torHost.count)} relays · ${fmtPct(torHost.share)} share`}
          dotColor={COLOR_TOR}
        />
      )}
      <StatTile
        label="Bitcoin infrastructure spread"
        value={`${fmt(btcAsns)} ASNs`}
        sub={`across ${fmt(btcCountries)} countries`}
        dotColor={COLOR_BITCOIN}
      />
      <StatTile
        label="Tor infrastructure spread"
        value={`${fmt(torAsns)} ASNs`}
        sub={`across ${fmt(torCountries)} countries`}
        dotColor={COLOR_TOR}
      />
      {topConnection && topConnectionNode && (
        <StatTile
          label="Biggest shared-infrastructure risk"
          value={hostLabel(topConnectionNode)}
          sub={`${fmt(topConnectionNode.bitcoinCount)} BTC nodes + ${fmt(topConnectionNode.torCount)} Tor relays`}
          dotColor={COLOR_LINK}
        />
      )}
    </div>
  );
}

// ---------- Detail table ----------

interface Row {
  label: string;
  note: string;
  bitcoin: number;
  bitcoinAvg: number;
  tor: number;
  torAvg: number;
}

function ScoreCell({ value, avg, showAvg, dotColor }: { value: number; avg: number; showAvg: boolean; dotColor: string }) {
  return (
    <td style={{ padding: "0.6rem 0.9rem", borderBottom: "1px solid #262234", textAlign: "right" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: "0.4rem" }}>
        <span
          style={{
            width: "0.4rem",
            height: "0.4rem",
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#e8e6f0", fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}>
          {fmt(value)}
        </span>
      </div>
      {showAvg && (
        <div style={{ color: "#726c86", fontSize: "0.72rem", fontVariantNumeric: "tabular-nums" }}>
          avg {fmtAvg(avg)}
        </div>
      )}
    </td>
  );
}

function ScoreRow({ row, showAvg }: { row: Row; showAvg: boolean }) {
  return (
    <tr>
      <td style={{ padding: "0.6rem 0.9rem", borderBottom: "1px solid #262234" }}>
        <div style={{ color: "#e8e6f0" }}>{row.label}</div>
        <div style={{ fontSize: "0.72rem", color: "#726c86" }}>{row.note}</div>
      </td>
      <ScoreCell value={row.bitcoin} avg={row.bitcoinAvg} showAvg={showAvg} dotColor={COLOR_BITCOIN} />
      <ScoreCell value={row.tor} avg={row.torAvg} showAvg={showAvg} dotColor={COLOR_TOR} />
    </tr>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <tr>
      <td colSpan={3} style={{ padding: "1.2rem 0.9rem 0.3rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e8e6f0" }}>{title}</div>
        <div style={{ fontSize: "0.72rem", color: "#726c86", marginTop: "0.1rem" }}>{subtitle}</div>
      </td>
    </tr>
  );
}

export default function ScoreTable({ data }: { data: NetworkData }) {
  const showAvg = data.rollingAverage.window_days > 1;

  const netRows: Row[] = [
    {
      label: "Nakamoto coefficient",
      note: "Fewest entities controlling >50%",
      bitcoin: data.bitcoin.nakamoto_network,
      bitcoinAvg: data.rollingAverage.bitcoin.avg_nakamoto_network,
      tor: data.tor.nakamoto_network,
      torAvg: data.rollingAverage.tor.avg_nakamoto_network,
    },
  ];

  const infraRows: Row[] = [
    {
      label: "Nakamoto coefficient",
      note: "Fewest hosting providers (ASNs) controlling >50% of nodes/relays",
      bitcoin: data.bitcoin.nakamoto_infra,
      bitcoinAvg: data.rollingAverage.bitcoin.avg_nakamoto_infra,
      tor: data.tor.nakamoto_infra,
      torAvg: data.rollingAverage.tor.avg_nakamoto_infra,
    },
    {
      label: "Herfindahl-Hirschman Index",
      note: "0 = maximally distributed, 10,000 = single provider",
      bitcoin: data.bitcoin.hhi_infra,
      bitcoinAvg: data.rollingAverage.bitcoin.avg_hhi_infra,
      tor: data.tor.hhi_infra,
      torAvg: data.rollingAverage.tor.avg_hhi_infra,
    },
  ];

  return (
    <section
      style={{
        background: "#08070f",
        padding: "3rem 1.5rem 4rem",
        fontFamily: "system-ui, sans-serif",
        color: "#c9c4dc",
      }}
    >
      <div style={{ maxWidth: "44rem", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.3rem", color: "#e8e6f0", margin: "0 0 0.3rem" }}>Scores</h2>
        <p style={{ fontSize: "0.85rem", color: "#8a84a0", margin: 0 }}>
          Today's snapshot ({data.snapshot_date})
          {showAvg
            ? ` alongside the ${data.rollingAverage.window_days}-day rolling average, which smooths out single-day noise.`
            : ". Rolling averages appear once more than one day of history has been collected."}
        </p>

        <Highlights data={data} />

        <div style={{ overflowX: "auto", marginTop: "1.8rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "28rem" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0 0.9rem 0.5rem",
                    fontSize: "0.75rem",
                    color: "#726c86",
                    fontWeight: 500,
                  }}
                >
                  Metric
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "0 0.9rem 0.5rem",
                    fontSize: "0.75rem",
                    color: COLOR_BITCOIN,
                    fontWeight: 500,
                  }}
                >
                  Bitcoin
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "0 0.9rem 0.5rem",
                    fontSize: "0.75rem",
                    color: COLOR_TOR,
                    fontWeight: 500,
                  }}
                >
                  Tor
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionHeading
                title="Network-level"
                subtitle="Bitcoin: mining pools by block share · Tor: mutual relay families"
              />
              {netRows.map((row) => (
                <ScoreRow key={row.label} row={row} showAvg={showAvg} />
              ))}

              <SectionHeading
                title="Infrastructure-level"
                subtitle="Concentration across hosting providers (ASNs) — the cross-layer risk layer"
              />
              {infraRows.map((row) => (
                <ScoreRow key={row.label} row={row} showAvg={showAvg} />
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "0.72rem", color: "#726c86", marginTop: "1.2rem" }}>
          {fmt(data.bitcoin.node_count)} Bitcoin nodes ({" "}
          <a href="https://bitnodes.io" style={{ color: "#8a84a0" }}>
            bitnodes.io
          </a>
          ) · {fmt(data.tor.relay_count)} Tor relays ({" "}
          <a href="https://metrics.torproject.org" style={{ color: "#8a84a0" }}>
            metrics.torproject.org
          </a>
          ) · ASNs resolved via{" "}
          <a href="https://www.team-cymru.com/ip-asn-mapping" style={{ color: "#8a84a0" }}>
            Team Cymru
          </a>
          .
        </p>
      </div>
    </section>
  );
}
