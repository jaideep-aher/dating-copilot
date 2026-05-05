/** In-process hourly rate limit (dev / single-node). Prefer Redis @ production scale. */

const map = new Map<string, number[]>();

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = Number(process.env.API_RATE_LIMIT_PER_HOUR ?? 80);

export function rateLimitOrThrow(scope: string, key: string): void {
  const now = Date.now();
  const id = `${scope}:${key}`;
  let slice = map.get(id);
  if (!slice) {
    slice = [];
    map.set(id, slice);
  }
  const cutoff = now - WINDOW_MS;
  while (slice.length && slice[0]! < cutoff) slice.shift();
  if (slice.length >= LIMIT) {
    const err = new Error("Too many requests");
    (err as Error & { status: number }).status = 429;
    throw err;
  }
  slice.push(now);
}
