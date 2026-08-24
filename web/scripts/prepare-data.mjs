// Runs before every `next build`/`next dev` (see package.json "prebuild").
// Joins the latest daily snapshot with the deterministic ASN sphere layout
// into a single static JSON file the client fetches at runtime.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SNAPSHOTS_DIR = path.join(ROOT, "data", "snapshots");
const LAYOUT_PATH = path.join(ROOT, "data", "layout", "asn-positions.json");
const OUT_DIR = path.join(import.meta.dirname, "..", "public", "data");
const OUT_PATH = path.join(OUT_DIR, "network.json");

function latestSnapshotFile() {
  const files = readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    throw new Error("No snapshots in data/snapshots — run `npm run pipeline` at the repo root first");
  }
  files.sort();
  return files[files.length - 1];
}

const snapshotFile = latestSnapshotFile();
const snapshot = JSON.parse(readFileSync(path.join(SNAPSHOTS_DIR, snapshotFile), "utf-8"));
const layout = JSON.parse(readFileSync(LAYOUT_PATH, "utf-8"));

const positionByAsn = new Map(layout.positions.map((p) => [p.asn, p]));

const asns = new Set([
  ...Object.keys(snapshot.bitcoin.asn_distribution),
  ...Object.keys(snapshot.tor.asn_distribution),
]);

const nodes = [...asns]
  .map((asn) => {
    const position = positionByAsn.get(asn);
    if (!position) return null; // layout not yet regenerated for this ASN
    return {
      asn,
      category: position.category,
      x: position.x,
      y: position.y,
      z: position.z,
      bitcoinCount: snapshot.bitcoin.asn_distribution[asn] ?? 0,
      torCount: snapshot.tor.asn_distribution[asn] ?? 0,
    };
  })
  .filter((n) => n !== null);

const output = {
  generated_at: new Date().toISOString(),
  snapshot_date: snapshotFile.replace(".json", ""),
  bitcoin: {
    node_count: snapshot.bitcoin.node_count,
    nakamoto_network: snapshot.bitcoin.nakamoto_network,
    nakamoto_infra: snapshot.bitcoin.nakamoto_infra,
    hhi_infra: snapshot.bitcoin.hhi_infra,
  },
  tor: {
    relay_count: snapshot.tor.relay_count,
    nakamoto_network: snapshot.tor.nakamoto_network,
    nakamoto_infra: snapshot.tor.nakamoto_infra,
    hhi_infra: snapshot.tor.hhi_infra,
  },
  nodes,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output));
console.log(`Wrote ${nodes.length} nodes from ${snapshotFile} to ${OUT_PATH}`);
