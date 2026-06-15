import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export const runtime = "nodejs";
// Read env at request time so the UI reflects live config, not build-time.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    ai: config.aiMode,
    tx: config.txMode,
  });
}
