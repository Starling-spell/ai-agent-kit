import { NextResponse } from "next/server";
import { config, fakeTxHash } from "@/lib/config";
import { explorerTx } from "@/lib/chains";
import type { AgentTx } from "@/lib/types";

export const runtime = "nodejs";

// Mock testnet executor. In live mode the transaction is sent client-side via
// the connected wallet (see components/AgentDetail.tsx); this endpoint only
// simulates it so the app works with no wallet and no keys.
export async function POST(req: Request) {
  try {
    const { chainId, summary } = await req.json();
    const id = Number(chainId);
    if (!id) {
      return NextResponse.json({ error: "chainId is required." }, { status: 400 });
    }

    // Guardrail: this endpoint never touches real funds — testnet, simulated only.
    if (config.txMode === "live") {
      return NextResponse.json(
        { error: "Live transactions are sent from the connected wallet, not here." },
        { status: 400 },
      );
    }

    await new Promise((r) => setTimeout(r, 450));
    const hash = fakeTxHash();
    const tx: AgentTx = {
      hash,
      chainId: id,
      explorerUrl: explorerTx(id, hash),
      summary: typeof summary === "string" ? summary : "agent action",
      status: "simulated",
      source: "mock",
    };
    return NextResponse.json({ tx });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Execute failed." },
      { status: 500 },
    );
  }
}
