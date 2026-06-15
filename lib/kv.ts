import { Redis } from "@upstash/redis";

// Server-side persistence via Vercel KV / Upstash Redis. Optional: when the
// env vars are absent the app silently falls back to per-browser localStorage,
// so it still builds and deploys with zero configuration.

export function kvEnabled(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
  );
}

let client: Redis | null = null;

export function kv(): Redis {
  if (!client) {
    client = new Redis({
      url: process.env.KV_REST_API_URL as string,
      token: process.env.KV_REST_API_TOKEN as string,
    });
  }
  return client;
}

/** Agents are namespaced by owner wallet address (lower-cased). */
export function ownerKey(owner: string): string {
  return `agents:${owner.toLowerCase()}`;
}
