/**
 * Nakamoto coefficient: smallest number of entities whose combined share
 * exceeds 50% of the total. `shares` are absolute counts/weights, not
 * pre-normalized percentages.
 */
export function nakamotoCoefficient(shares: number[]): number {
  const total = shares.reduce((sum, s) => sum + s, 0);
  if (total <= 0) return 0;

  const sorted = [...shares].sort((a, b) => b - a);
  const threshold = total / 2;

  let cumulative = 0;
  let count = 0;
  for (const share of sorted) {
    cumulative += share;
    count += 1;
    if (cumulative > threshold) break;
  }
  return count;
}

/**
 * Herfindahl-Hirschman Index on a 0-10000 scale (sum of squared percentage
 * shares). 10000 = full monopoly, near 0 = maximally distributed.
 */
export function herfindahlIndex(shares: number[]): number {
  const total = shares.reduce((sum, s) => sum + s, 0);
  if (total <= 0) return 0;

  return shares.reduce((sum, s) => {
    const pct = (s / total) * 100;
    return sum + pct * pct;
  }, 0);
}
