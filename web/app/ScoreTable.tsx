import type { NetworkData } from "./networkData";
import { COLOR_BITCOIN, COLOR_TOR } from "./colors";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtAvg(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

interface Row {
  label: string;
  note: string;
  bitcoin: number;
  bitcoinAvg: number;
  tor: number;
  torAvg: number;
}

function ScoreRow({ row }: { row: Row }) {
  return (
    <tr>
      <td style={{ padding: "0.6rem 0.9rem", borderBottom: "1px solid #262234" }}>
        <div>{row.label}</div>
        <div style={{ fontSize: "0.72rem", color: "#726c86" }}>{row.note}</div>
      </td>
      <td
        style={{
          padding: "0.6rem 0.9rem",
          borderBottom: "1px solid #262234",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ color: COLOR_BITCOIN, fontSize: "0.95rem" }}>{fmt(row.bitcoin)}</span>
        <span style={{ color: "#726c86", fontSize: "0.75rem" }}> (avg {fmtAvg(row.bitcoinAvg)})</span>
      </td>
      <td
        style={{
          padding: "0.6rem 0.9rem",
          borderBottom: "1px solid #262234",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ color: COLOR_TOR, fontSize: "0.95rem" }}>{fmt(row.tor)}</span>
        <span style={{ color: "#726c86", fontSize: "0.75rem" }}> (avg {fmtAvg(row.torAvg)})</span>
      </td>
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
          Today's snapshot ({data.snapshot_date}) alongside the {data.rollingAverage.window_days}-day
          rolling average, which smooths out single-day noise.
        </p>

        <div style={{ overflowX: "auto", marginTop: "1.2rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "28rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0 0.9rem 0.5rem", fontSize: "0.75rem", color: "#726c86", fontWeight: 500 }}>
                  Metric
                </th>
                <th style={{ textAlign: "right", padding: "0 0.9rem 0.5rem", fontSize: "0.75rem", color: COLOR_BITCOIN, fontWeight: 500 }}>
                  Bitcoin
                </th>
                <th style={{ textAlign: "right", padding: "0 0.9rem 0.5rem", fontSize: "0.75rem", color: COLOR_TOR, fontWeight: 500 }}>
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
                <ScoreRow key={row.label} row={row} />
              ))}

              <SectionHeading
                title="Infrastructure-level"
                subtitle="Concentration across hosting providers (ASNs) — the cross-layer risk layer"
              />
              {infraRows.map((row) => (
                <ScoreRow key={row.label} row={row} />
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
