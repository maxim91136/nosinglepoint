const POOLS_URL = "https://mempool.space/api/v1/mining/pools/1w";

export interface PoolShare {
  poolName: string;
  blockCount: number;
}

interface MempoolPoolsResponse {
  pools: Array<{ name: string; blockCount: number }>;
}

/** Mining pool block shares over the trailing 7 days. */
export async function fetchPoolShares(): Promise<PoolShare[]> {
  const res = await fetch(POOLS_URL);
  if (!res.ok) {
    throw new Error(`mempool.space pools request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as MempoolPoolsResponse;

  return body.pools.map((p) => ({ poolName: p.name, blockCount: p.blockCount }));
}
