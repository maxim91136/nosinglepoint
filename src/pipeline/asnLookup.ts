import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "..", "..", "data", "asn-cache.json");

const CYMRU_HOST = "whois.cymru.com";
const CYMRU_PORT = 43;
const CHUNK_SIZE = 1000;

export interface AsnInfo {
  asn: string;
  asName: string;
  /** ISO 3166-1 alpha-2 country code, as reported by the whois registry. */
  cc: string;
  resolvedAt: string;
}

type AsnCache = Record<string, AsnInfo>;

function loadCache(): AsnCache {
  if (!existsSync(CACHE_PATH)) return {};
  return JSON.parse(readFileSync(CACHE_PATH, "utf-8")) as AsnCache;
}

function saveCache(cache: AsnCache): void {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
}

/** Sends one bulk query to the Team Cymru whois service and parses the response. */
function queryCymru(ips: string[]): Promise<Map<string, AsnInfo>> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(CYMRU_PORT, CYMRU_HOST);
    let buffer = "";

    socket.setTimeout(30_000, () => {
      socket.destroy();
      reject(new Error(`Team Cymru whois lookup timed out (${ips.length} IPs)`));
    });

    socket.on("connect", () => {
      const query = ["begin", "verbose", ...ips, "end", ""].join("\n");
      socket.write(query);
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
    });

    socket.on("error", reject);

    socket.on("close", () => {
      const result = new Map<string, AsnInfo>();
      const lines = buffer.split("\n").filter((l) => l.trim().length > 0);
      // First line is the column header ("AS | IP | BGP Prefix | CC | Registry | Allocated | AS Name").
      for (const line of lines.slice(1)) {
        const fields = line.split("|").map((f) => f.trim());
        const [asn, ip, , cc, , , asName] = fields;
        if (!asn || !ip) continue;
        if (asn === "NA") continue; // no route/ASN found for this IP
        result.set(ip, {
          asn: `AS${asn}`,
          asName: asName ?? "Unknown",
          cc: cc || "??",
          resolvedAt: new Date().toISOString(),
        });
      }
      resolve(result);
    });
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Resolves ASN + AS name for a list of IPs, using data/asn-cache.json to
 * avoid re-querying IPs already looked up in a previous run.
 */
export async function resolveAsns(ips: string[]): Promise<Map<string, AsnInfo>> {
  const cache = loadCache();
  const uniqueIps = [...new Set(ips)];
  // Also re-queries entries from before the `cc` field existed, as a one-time cache migration.
  const uncached = uniqueIps.filter((ip) => !(ip in cache) || cache[ip]!.cc === undefined);

  if (uncached.length > 0) {
    for (const batch of chunk(uncached, CHUNK_SIZE)) {
      const resolved = await queryCymru(batch);
      for (const [ip, info] of resolved) {
        cache[ip] = info;
      }
    }
    saveCache(cache);
  }

  const result = new Map<string, AsnInfo>();
  for (const ip of uniqueIps) {
    const info = cache[ip];
    if (info) result.set(ip, info);
  }
  return result;
}
