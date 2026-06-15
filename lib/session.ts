import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Minimal stateless session for SIWE: an HMAC-signed { address, exp } token
// stored in an httpOnly cookie. No DB needed. Set SESSION_SECRET in production;
// without it a fixed dev secret is used (fine for local, NOT for real auth).

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

export function createSession(address: string): {
  token: string;
  maxAge: number;
} {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ address: address.toLowerCase(), exp }),
  ).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, maxAge: TTL_SECONDS };
}

/** Returns the authenticated lower-cased address, or null if invalid/expired. */
export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { address, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    if (!address || typeof exp !== "number") return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return String(address).toLowerCase();
  } catch {
    return null;
  }
}
