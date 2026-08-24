# NoSinglePoint

A visual meta-overview of how centralized or distributed open, public networks currently are — data-driven, with transparent, mathematically grounded scores per network.

## Status

Step 1: data pipeline for Bitcoin and Tor. Collects node/relay raw data, resolves ASNs consistently via Team Cymru, and computes Nakamoto coefficients (network and infrastructure level) plus HHI values. No frontend, no visualization yet.

## Running the pipeline

```bash
npm install
npm run pipeline
```

Writes a snapshot to `data/snapshots/YYYY-MM-DD.json`. ASN lookups are cached in `data/asn-cache.json`; repeated runs only re-query new IPs.

## Data sources

- Bitcoin nodes: [bitnodes.io API](https://bitnodes.io/api/)
- Bitcoin mining pools: [mempool.space API](https://mempool.space/docs/api/rest)
- Tor relays: [Onionoo](https://metrics.torproject.org/onionoo.html)
- ASN resolution: [Team Cymru IP-to-ASN Bulk Whois](https://www.team-cymru.com/ip-asn-mapping)

## License

Code: MIT. Methodology/scores: CC BY 4.0.
