import { NextResponse } from "next/server";
import { settle } from "@/lib/arc";

export const runtime = "nodejs";

// Step 3: act on the verdict — release USDC to the freelancer or refund the client.
export async function POST(req: Request) {
  try {
    const { escrowId, meetsSpec, budgetUsdc, freelancer, client } =
      await req.json();

    if (
      !escrowId ||
      typeof meetsSpec !== "boolean" ||
      typeof budgetUsdc !== "number"
    ) {
      return NextResponse.json(
        { error: "escrowId, meetsSpec and budgetUsdc are required." },
        { status: 400 },
      );
    }

    const settlement = await settle({
      escrowId,
      meetsSpec,
      budgetUsdc,
      freelancer: freelancer ?? "",
      client: client ?? "",
    });
    return NextResponse.json({ settlement });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Settlement failed." },
      { status: 500 },
    );
  }
}
