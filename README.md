# NoSinglePoint

**[nosinglepoint.com](https://nosinglepoint.com)**

A visual meta-overview of how centralized or distributed open, public networks currently are — data-driven, with transparent, mathematically grounded scores per network. No opinion, just data.

Bitcoin and Tor are rendered as two bioluminescent clusters, each ASN (hosting provider) placed at a deterministic position derived from a hash of its number, so the same provider always lands in the same spot. Root-like threads connect ASNs that host infrastructure for both networks — the project's core thesis: two networks that look independent can share a surprising amount of physical infrastructure underneath.

## What it measures

Two separate Nakamoto coefficients per network, not conflated:

- **Network-level** — Bitcoin: mining pools by block share. Tor: mutual relay families. How many entities would you need to control to break the protocol's own consensus?
- **Infrastructure-level** — how many distinct hosting providers (ASNs) would you need to compromise to take down >50% of nodes/relays? This is the cross-layer risk layer: the same hosting provider can appear under both networks.

Both are paired with a Herfindahl-Hirschman Index (0 = maximally distributed, 10,000 = single provider) and a 7-day rolling average that smooths out single-day noise.

## Architecture

Two independent pieces in one repo:

- **`src/pipeline/`** — a TypeScript/Node data pipeline (no framework) that fetches raw node/relay data, resolves every IP to an ASN, computes the scores, and writes daily JSON snapshots. Runs on a GitHub Actions cron.
- **`web/`** — a Next.js static-export frontend (Three.js/React Three Fiber scene, score table, mobile-optimized) that reads the pipeline's output and deploys to Cloudflare Pages on every push.

The frontend never talks to a live API — it's fully static, rebuilt from whatever the pipeline last committed to `data/`.

## Running the pipeline

```bash
npm install
npm run pipeline
```

Writes a snapshot to `data/snapshots/YYYY-MM-DD.json`, a deterministic ASN sphere layout to `data/layout/asn-positions.json`, and a 7-day rolling average to `data/scores/latest.json`. ASN lookups are cached in `data/asn-cache.json`; repeated runs only re-query new IPs. A GitHub Actions workflow (`.github/workflows/pipeline.yml`) runs this daily and commits the result.

## Running the frontend

```bash
cd web
npm install
npm run dev
```

The `prebuild` step joins the latest snapshot + layout + rolling average into `web/public/data/network.json`, which the client fetches once on load. `npm run build` produces the static export Cloudflare Pages deploys (root directory `web`, build command `npm run build`, output directory `out`).

## Data sources

- Bitcoin nodes: [bitnodes.io API](https://bitnodes.io/api/)
- Bitcoin mining pools: [mempool.space API](https://mempool.space/docs/api/rest)
- Tor relays: [Onionoo](https://metrics.torproject.org/onionoo.html)
- ASN + country resolution: [Team Cymru IP-to-ASN Bulk Whois](https://www.team-cymru.com/ip-asn-mapping)

## Part of a series

Sibling projects exploring decentralization from different angles: [SatoshisGrid](https://satoshisgrid.com) (Bitcoin network visualization) and [NotSoDeFi](https://notsodefi.com) (DeFi decentralization framework).

## License

Code: MIT. Methodology/scores: CC BY 4.0.
