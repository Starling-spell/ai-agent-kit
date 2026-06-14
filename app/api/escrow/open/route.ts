import { NextResponse } from "next/server";
import { openEscrow } from "@/lib/arc";

export const runtime = "nodejs";

// Step 1 of the lifecycle: lock the job budget in an Arc USDC escrow.
export async function POST(req: Request) {
  try {
    const { jobId, budgetUsdc } = await req.json();

    if (!jobId || typeof budgetUsdc !== "number" || budgetUsdc <= 0) {
      return NextResponse.json(
        { error: "jobId and a positive budgetUsdc are required." },
        { status: 400 },
      );
    }

    const result = await openEscrow(jobId, budgetUsdc);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to open escrow." },
      { status: 500 },
    );
  }
}
