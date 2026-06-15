import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kv, kvEnabled, ownerKey } from "@/lib/kv";
import { readSession } from "@/lib/session";
import type { Agent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server persistence for agents. The owner is taken from the SIWE session
// cookie (not a client-supplied param), so it cannot be spoofed by address.

function authedOwner(): string | null {
  return readSession(cookies().get("session")?.value);
}

export async function GET() {
  if (!kvEnabled()) {
    return NextResponse.json({ error: "KV not configured" }, { status: 501 });
  }
  const owner = authedOwner();
  if (!owner) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const agents = (await kv().get<Agent[]>(ownerKey(owner))) ?? [];
  return NextResponse.json({ agents });
}

export async function PUT(req: Request) {
  if (!kvEnabled()) {
    return NextResponse.json({ error: "KV not configured" }, { status: 501 });
  }
  const owner = authedOwner();
  if (!owner) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const { agents } = await req.json();
  if (!Array.isArray(agents)) {
    return NextResponse.json({ error: "agents[] is required" }, { status: 400 });
  }
  await kv().set(ownerKey(owner), agents);
  return NextResponse.json({ ok: true, count: agents.length });
}
