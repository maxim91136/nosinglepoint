const DETAILS_URL =
  "https://onionoo.torproject.org/details?type=relay&running=true&fields=fingerprint,or_addresses,effective_family,consensus_weight";

interface OnionooRelay {
  fingerprint: string;
  or_addresses: string[];
  effective_family?: string[];
  consensus_weight?: number;
}

interface OnionooDetailsResponse {
  relays: OnionooRelay[];
}

export interface TorRelaysResult {
  relayCount: number;
  /** Public IPs, one per relay (first OR address), for ASN resolution. */
  ips: string[];
  /** IP -> consensus weight, used to weight ASN-level distribution. */
  weightByIp: Map<string, number>;
  /** Consensus-weight sum per mutual-family cluster, for the network-level Nakamoto coefficient. */
  familyWeights: number[];
}

function extractIp(orAddress: string): string {
  if (orAddress.startsWith("[")) {
    return orAddress.slice(1, orAddress.indexOf("]"));
  }
  return orAddress.slice(0, orAddress.lastIndexOf(":"));
}

/** Union-find over relay fingerprints, merged along effective_family edges. */
class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }
}

export async function fetchTorRelays(): Promise<TorRelaysResult> {
  const res = await fetch(DETAILS_URL);
  if (!res.ok) {
    throw new Error(`onionoo details request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as OnionooDetailsResponse;

  const uf = new UnionFind();
  const weightByFingerprint = new Map<string, number>();
  const ips: string[] = [];
  const weightByIp = new Map<string, number>();

  for (const relay of body.relays) {
    const weight = relay.consensus_weight ?? 0;
    weightByFingerprint.set(relay.fingerprint, weight);
    uf.find(relay.fingerprint);
    for (const other of relay.effective_family ?? []) {
      uf.union(relay.fingerprint, other);
    }

    const firstAddress = relay.or_addresses[0];
    if (firstAddress) {
      const ip = extractIp(firstAddress);
      ips.push(ip);
      weightByIp.set(ip, (weightByIp.get(ip) ?? 0) + weight);
    }
  }

  const weightByCluster = new Map<string, number>();
  for (const [fingerprint, weight] of weightByFingerprint) {
    const root = uf.find(fingerprint);
    weightByCluster.set(root, (weightByCluster.get(root) ?? 0) + weight);
  }

  return {
    relayCount: body.relays.length,
    ips,
    weightByIp,
    familyWeights: [...weightByCluster.values()],
  };
}
