import { NextResponse } from "next/server";
import { kv, kvEnabled, ownerKey } from "@/lib/kv";
import type { Agent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server persistence for agents, keyed by owner wallet address. Last-write-wins
// (the client owns the full list). NOTE: ownership is not cryptographically
// verified here — add SIWE before treating this as multi-tenant auth. Testnet
// pilot only.

export async function GET(req: Request) {
  if (!kvEnabled()) {
    return NextResponse.json({ error: "KV not configured" }, { status: 501 });
  }
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) {
    return NextResponse.json({ error: "owner is required" }, { status: 400 });
  }
  const agents = (await kv().get<Agent[]>(ownerKey(owner))) ?? [];
  return NextResponse.json({ agents });
}

export async function PUT(req: Request) {
  if (!kvEnabled()) {
    return NextResponse.json({ error: "KV not configured" }, { status: 501 });
  }
  const { owner, agents } = await req.json();
  if (!owner || !Array.isArray(agents)) {
    return NextResponse.json(
      { error: "owner and agents[] are required" },
      { status: 400 },
    );
  }
  await kv().set(ownerKey(owner), agents);
  return NextResponse.json({ ok: true, count: agents.length });
}
