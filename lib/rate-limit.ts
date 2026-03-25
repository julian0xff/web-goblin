const windowMs = 60_000;
const maxRequests = 10;
const cleanupInterval = 120_000;

const requests = new Map<string, number[]>();

setInterval(() => {
  const cutoff = Date.now() - windowMs;
  for (const [key, timestamps] of requests) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      requests.delete(key);
    } else {
      requests.set(key, valid);
    }
  }
}, cleanupInterval);

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (requests.get(ip) ?? []).filter((t) => t > cutoff);
  timestamps.push(now);
  requests.set(ip, timestamps);
  return timestamps.length <= maxRequests;
}
