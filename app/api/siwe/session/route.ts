import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Report the currently signed-in address (or null).
export async function GET() {
  const address = readSession(cookies().get("session")?.value);
  return NextResponse.json({ address });
}
