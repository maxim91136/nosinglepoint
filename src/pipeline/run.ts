import { fetchBitcoinNodes } from "./sources/bitnodes.js";
import { fetchPoolShares } from "./sources/miningPools.js";
import { fetchTorRelays } from "./sources/onionoo.js";
import { resolveAsns } from "./asnLookup.js";
import { buildSnapshot, writeSnapshot } from "./snapshot.js";

async function main() {
  console.log("Fetching Bitcoin nodes, mining pools, and Tor relays...");
  const [bitcoinNodes, poolShares, torRelays] = await Promise.all([
    fetchBitcoinNodes(),
    fetchPoolShares(),
    fetchTorRelays(),
  ]);
  console.log(
    `Bitcoin: ${bitcoinNodes.nodeCount} nodes, ${poolShares.length} pools. Tor: ${torRelays.relayCount} relays.`,
  );

  const allIps = [...bitcoinNodes.ips, ...torRelays.ips];
  console.log(`Resolving ASNs for ${new Set(allIps).size} unique IPs via Team Cymru...`);
  const asnByIp = await resolveAsns(allIps);
  console.log(`Resolved ${asnByIp.size} IPs to ASNs.`);

  const snapshot = buildSnapshot({
    bitcoin: {
      nodeCount: bitcoinNodes.nodeCount,
      ips: bitcoinNodes.ips,
      poolBlockCounts: poolShares.map((p) => p.blockCount),
    },
    tor: {
      relayCount: torRelays.relayCount,
      ips: torRelays.ips,
      familyWeights: torRelays.familyWeights,
    },
    asnByIp,
  });

  const filePath = writeSnapshot(snapshot);
  console.log(`Snapshot written to ${filePath}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exitCode = 1;
});
