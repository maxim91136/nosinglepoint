// Shared shape of public/data/network.json (see scripts/prepare-data.mjs),
// used by the scene, the score table, and the page that fetches it once.

export type Side = "bitcoin" | "tor";

export interface NetworkNode {
  asn: string;
  category: string;
  providerName: string | null;
  country: string;
  x: number;
  y: number;
  z: number;
  bitcoinCount: number;
  torCount: number;
}

export interface Connection {
  asn: string;
  dominance: number;
}

export interface NetworkStats {
  nakamoto_network: number;
  nakamoto_infra: number;
  hhi_infra: number;
}

export interface RollingAverageStats {
  avg_nakamoto_network: number;
  avg_nakamoto_infra: number;
  avg_hhi_infra: number;
}

export interface NetworkData {
  generated_at: string;
  snapshot_date: string;
  bitcoin: NetworkStats & { node_count: number };
  tor: NetworkStats & { relay_count: number };
  nodes: NetworkNode[];
  connections: Connection[];
  rollingAverage: {
    window_days: number;
    bitcoin: RollingAverageStats;
    tor: RollingAverageStats;
  };
}
