import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export const runtime = "nodejs";
// Read env at request time so the mode banner reflects live config, not build-time.
export const dynamic = "force-dynamic";

// Lets the UI show whether it is running on simulated or real rails.
export async function GET() {
  return NextResponse.json({
    ok: true,
    adjudicator: config.adjudicatorMode,
    settlement: config.settlementMode,
    feeBps: config.feeBps,
  });
}
