const SNAPSHOT_URL = "https://bitnodes.io/api/v1/snapshots/latest/";

export interface BitcoinNodesResult {
  nodeCount: number;
  /** Public IPv4/IPv6 addresses only; .onion and unresolvable peers are excluded. */
  ips: string[];
}

/**
 * Splits an ADDRESS:PORT key into a bare address, handling bracketed IPv6
 * (e.g. "[2001:db8::1]:8333") and plain IPv4 ("1.2.3.4:8333") forms.
 */
function extractAddress(key: string): string {
  if (key.startsWith("[")) {
    return key.slice(1, key.indexOf("]"));
  }
  return key.slice(0, key.lastIndexOf(":"));
}

export async function fetchBitcoinNodes(): Promise<BitcoinNodesResult> {
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) {
    throw new Error(`bitnodes snapshot request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { nodes: Record<string, unknown> };

  const keys = Object.keys(body.nodes);
  const ips = keys
    .map(extractAddress)
    .filter((addr) => !addr.endsWith(".onion"));

  return { nodeCount: keys.length, ips };
}
