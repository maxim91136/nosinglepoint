import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { murmurhash3_32 } from "./hash.js";
import { categorizeAsn } from "./providers.js";
import type { Snapshot } from "./snapshot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = path.join(__dirname, "..", "..", "data", "snapshots");
const LAYOUT_DIR = path.join(__dirname, "..", "..", "data", "layout");

// Different seeds for the two hash draws so they are statistically
// independent instead of just being the same value.
const THETA_SEED = 0x9747b28c;
const PHI_SEED = 0x1b873593;

export interface AsnPosition {
  asn: string;
  category: string;
  /** Unit-sphere coordinates (radius 1); the frontend scales/positions the cluster. */
  x: number;
  y: number;
  z: number;
}

export interface AsnLayout {
  generated_at: string;
  asn_count: number;
  positions: AsnPosition[];
}

/** Union of every ASN seen across all collected daily snapshots, for layout stability. */
function collectKnownAsns(): Set<string> {
  const asns = new Set<string>();
  const files = readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const snapshot = JSON.parse(
      readFileSync(path.join(SNAPSHOTS_DIR, file), "utf-8"),
    ) as Snapshot;
    for (const asn of Object.keys(snapshot.bitcoin.asn_distribution)) asns.add(asn);
    for (const asn of Object.keys(snapshot.tor.asn_distribution)) asns.add(asn);
  }

  return asns;
}

/**
 * Maps an ASN to a deterministic point on the unit sphere. Uniform over the
 * sphere surface (not just uniform in theta/phi) via the standard
 * theta = 2*pi*u, phi = acos(2*v - 1) construction.
 */
function asnToSpherePosition(asn: string): { x: number; y: number; z: number } {
  const u = murmurhash3_32(asn, THETA_SEED) / 0xffffffff;
  const v = murmurhash3_32(asn, PHI_SEED) / 0xffffffff;

  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);

  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.sin(phi) * Math.sin(theta),
    z: Math.cos(phi),
  };
}

export function computeAsnLayout(): AsnLayout {
  const asns = [...collectKnownAsns()].sort();

  const positions = asns.map((asn) => ({
    asn,
    category: categorizeAsn(asn),
    ...asnToSpherePosition(asn),
  }));

  return {
    generated_at: new Date().toISOString(),
    asn_count: positions.length,
    positions,
  };
}

export function writeAsnLayout(layout: AsnLayout): string {
  mkdirSync(LAYOUT_DIR, { recursive: true });
  const filePath = path.join(LAYOUT_DIR, "asn-positions.json");
  writeFileSync(filePath, JSON.stringify(layout, null, 2) + "\n");
  return filePath;
}
