import { NextResponse } from "next/server";
import { newNonce } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Issue a one-time nonce and stash it in an httpOnly cookie for verification.
export async function GET() {
  const nonce = newNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set("siwe-nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
