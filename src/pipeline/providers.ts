import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVIDERS_PATH = path.join(__dirname, "..", "..", "data", "providers.json");

interface ProviderEntry {
  name: string;
  category: string;
}

const providers: Record<string, ProviderEntry> = JSON.parse(
  readFileSync(PROVIDERS_PATH, "utf-8"),
);

/** Hand-maintained ASN -> category lookup. Unrecognized ASNs are "Unknown". */
export function categorizeAsn(asn: string): string {
  return providers[asn]?.category ?? "Unknown";
}
