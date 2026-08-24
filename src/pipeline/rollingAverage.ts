import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Snapshot } from "./snapshot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = path.join(__dirname, "..", "..", "data", "snapshots");
const SCORES_DIR = path.join(__dirname, "..", "..", "data", "scores");

const WINDOW_DAYS = 7;

interface NetworkAverage {
  network_name: string;
  days_averaged: number;
  avg_nakamoto_network: number;
  avg_nakamoto_infra: number;
  avg_hhi_infra: number;
}

export interface RollingAverageScores {
  as_of: string;
  window_days: number;
  bitcoin: NetworkAverage;
  tor: NetworkAverage;
}

/** Loads up to the last WINDOW_DAYS daily snapshots, most recent first. */
function loadRecentSnapshots(): Snapshot[] {
  const files = readdirSync(SNAPSHOTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, WINDOW_DAYS);

  return files.map(
    (f) => JSON.parse(readFileSync(path.join(SNAPSHOTS_DIR, f), "utf-8")) as Snapshot,
  );
}

function average(values: number[]): number {
  const rounded = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(rounded * 100) / 100;
}

function averageNetwork(
  networkName: string,
  networkKey: "bitcoin" | "tor",
  snapshots: Snapshot[],
): NetworkAverage {
  const entries = snapshots.map((s) => s[networkKey]);
  return {
    network_name: networkName,
    days_averaged: entries.length,
    avg_nakamoto_network: average(entries.map((e) => e.nakamoto_network)),
    avg_nakamoto_infra: average(entries.map((e) => e.nakamoto_infra)),
    avg_hhi_infra: average(entries.map((e) => e.hhi_infra)),
  };
}

/**
 * Averages the Nakamoto/HHI scores over the last WINDOW_DAYS daily
 * snapshots, smoothing out single-day noise (e.g. a temporary node-count
 * dip skewing the ASN distribution). Falls back to whatever history exists
 * if fewer than WINDOW_DAYS snapshots have been collected yet.
 */
export function computeRollingAverages(): RollingAverageScores {
  const snapshots = loadRecentSnapshots();
  if (snapshots.length === 0) {
    throw new Error("No snapshots found in data/snapshots — run the pipeline at least once first");
  }

  return {
    as_of: new Date().toISOString(),
    window_days: snapshots.length,
    bitcoin: averageNetwork("Bitcoin", "bitcoin", snapshots),
    tor: averageNetwork("Tor", "tor", snapshots),
  };
}

export function writeRollingAverages(scores: RollingAverageScores): string {
  mkdirSync(SCORES_DIR, { recursive: true });
  const filePath = path.join(SCORES_DIR, "latest.json");
  writeFileSync(filePath, JSON.stringify(scores, null, 2) + "\n");
  return filePath;
}
