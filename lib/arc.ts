import { config, fakeTxHash, usd } from "./config";
import type { Settlement } from "./types";

// ============================================================
//  Arc adapter — the settlement & economy "rails".
//  Holds USDC in escrow, then releases to the freelancer or
//  refunds the client based on the GenLayer verdict, taking a
//  platform fee on release. Mock by default; live mode wires
//  the Arc App Kit (bridge/send/swap + escrow).
// ============================================================

export interface EscrowOpenResult {
  escrowId: string;
  txHash: string;
  source: "arc" | "mock";
}

/** Open (fund) an escrow that locks the job budget in USDC. */
export async function openEscrow(
  jobId: string,
  budgetUsdc: number,
): Promise<EscrowOpenResult> {
  if (config.settlementMode === "live") {
    return liveOpenEscrow(jobId, budgetUsdc);
  }
  await new Promise((r) => setTimeout(r, 400));
  return {
    escrowId: `arc_escrow_${jobId.slice(0, 8)}`,
    txHash: fakeTxHash(),
    source: "mock",
  };
}

/**
 * Settle an escrow. On a passing verdict the freelancer is paid the budget
 * minus the platform fee; on a failing verdict the client is fully refunded.
 */
export async function settle(params: {
  escrowId: string;
  meetsSpec: boolean;
  budgetUsdc: number;
  freelancer: string;
  client: string;
}): Promise<Settlement> {
  const { escrowId, meetsSpec, budgetUsdc, freelancer, client } = params;

  if (config.settlementMode === "live") {
    return liveSettle(params);
  }

  await new Promise((r) => setTimeout(r, 500));

  if (meetsSpec) {
    const feeUsdc = usd((budgetUsdc * config.feeBps) / 10_000);
    return {
      action: "release",
      recipient: freelancer,
      amountUsdc: usd(budgetUsdc - feeUsdc),
      feeUsdc,
      txHash: fakeTxHash(),
      source: "mock",
    };
  }

  return {
    action: "refund",
    recipient: client,
    amountUsdc: usd(budgetUsdc),
    feeUsdc: 0,
    txHash: fakeTxHash(),
    source: "mock",
  };
}

// ------------------------------------------------------------
//  Live integration points (stubbed).
//  The Arc App Kit exposes bridge()/send()/swap()/unifiedBalance()
//  over a viem or solana adapter. Wire your escrow contract +
//  send() calls here, then set SETTLEMENT_MODE=live.
//  Docs: https://www.arc.io/app-kits · https://docs.arc.io/build/agentic-economy
// ------------------------------------------------------------

async function liveOpenEscrow(
  _jobId: string,
  _budgetUsdc: number,
): Promise<EscrowOpenResult> {
  if (!config.arc.rpcUrl || !config.arc.operatorPrivateKey) {
    throw new Error("Live settlement needs ARC_RPC_URL and ARC_OPERATOR_PRIVATE_KEY.");
  }
  // TODO: deposit USDC into your escrow (ERC-8183 job contract) via the Arc App Kit.
  //   const kit = createArcKit({ adapter: viemAdapter(walletClient) });
  //   const { txHash } = await kit.send({ token: 'USDC', amount, to: escrowAddress });
  throw new Error("Arc live escrow not implemented yet — see lib/arc.ts.");
}

async function liveSettle(_params: {
  escrowId: string;
  meetsSpec: boolean;
  budgetUsdc: number;
  freelancer: string;
  client: string;
}): Promise<Settlement> {
  if (!config.arc.rpcUrl || !config.arc.operatorPrivateKey) {
    throw new Error("Live settlement needs ARC_RPC_URL and ARC_OPERATOR_PRIVATE_KEY.");
  }
  // TODO: release or refund from escrow via the Arc App Kit, taking the platform fee.
  throw new Error("Arc live settlement not implemented yet — see lib/arc.ts.");
}
