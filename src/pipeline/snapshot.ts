import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { nakamotoCoefficient, herfindahlIndex } from "./scoring.js";
import type { AsnInfo } from "./asnLookup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = path.join(__dirname, "..", "..", "data", "snapshots");

interface NetworkSnapshot {
  network_name: string;
  metric_source: string;
  node_count?: number;
  relay_count?: number;
  nakamoto_network: number;
  nakamoto_infra: number;
  hhi_infra: number;
  asn_distribution: Record<string, number>;
}

export interface Snapshot {
  timestamp: string;
  bitcoin: NetworkSnapshot;
  tor: NetworkSnapshot;
}

/** Counts occurrences of each resolved ASN across a list of IPs (duplicates count once per occurrence). */
function asnDistribution(ips: string[], asnByIp: Map<string, AsnInfo>): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const ip of ips) {
    const asn = asnByIp.get(ip)?.asn;
    if (!asn) continue;
    distribution[asn] = (distribution[asn] ?? 0) + 1;
  }
  return distribution;
}

export function buildSnapshot(input: {
  bitcoin: { nodeCount: number; ips: string[]; poolBlockCounts: number[] };
  tor: { relayCount: number; ips: string[]; familyWeights: number[] };
  asnByIp: Map<string, AsnInfo>;
}): Snapshot {
  const bitcoinAsnDist = asnDistribution(input.bitcoin.ips, input.asnByIp);
  const torAsnDist = asnDistribution(input.tor.ips, input.asnByIp);

  return {
    timestamp: new Date().toISOString(),
    bitcoin: {
      network_name: "Bitcoin",
      metric_source: "bitnodes.io + mempool.space",
      node_count: input.bitcoin.nodeCount,
      nakamoto_network: nakamotoCoefficient(input.bitcoin.poolBlockCounts),
      nakamoto_infra: nakamotoCoefficient(Object.values(bitcoinAsnDist)),
      hhi_infra: Math.round(herfindahlIndex(Object.values(bitcoinAsnDist))),
      asn_distribution: bitcoinAsnDist,
    },
    tor: {
      network_name: "Tor",
      metric_source: "metrics.torproject.org",
      relay_count: input.tor.relayCount,
      nakamoto_network: nakamotoCoefficient(input.tor.familyWeights),
      nakamoto_infra: nakamotoCoefficient(Object.values(torAsnDist)),
      hhi_infra: Math.round(herfindahlIndex(Object.values(torAsnDist))),
      asn_distribution: torAsnDist,
    },
  };
}

export function writeSnapshot(snapshot: Snapshot): string {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const dateStr = snapshot.timestamp.slice(0, 10); // YYYY-MM-DD
  const filePath = path.join(SNAPSHOTS_DIR, `${dateStr}.json`);
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2) + "\n");
  return filePath;
}
