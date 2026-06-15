import { NextResponse } from "next/server";
import { runAgent } from "@/lib/genlayer";
import type { ActionKind } from "@/lib/types";

export const runtime = "nodejs";
// GenLayer consensus can take time in live mode.
export const maxDuration = 60;

// Run an agent: GenLayer returns an AI response + a structured decision.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, runId, instructions, input } = body;
    const action: ActionKind = body.action ?? "none";

    if (!runId || typeof instructions !== "string" || !input) {
      return NextResponse.json(
        { error: "runId, instructions and input are required." },
        { status: 400 },
      );
    }

    const result = await runAgent({
      agentId: agentId ?? "agent",
      runId,
      instructions,
      input,
      action,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent run failed." },
      { status: 500 },
    );
  }
}
