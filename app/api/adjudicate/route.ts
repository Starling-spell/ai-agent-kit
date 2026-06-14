import { NextResponse } from "next/server";
import { adjudicate } from "@/lib/genlayer";

export const runtime = "nodejs";
// Adjudication can wait on consensus; give it headroom (Vercel Pro: up to 300s).
export const maxDuration = 60;

// Step 2: ask GenLayer whether the deliverable meets the acceptance criteria.
export async function POST(req: Request) {
  try {
    const { jobId, spec, deliverable } = await req.json();

    if (!jobId || !spec || !deliverable) {
      return NextResponse.json(
        { error: "jobId, spec and deliverable are required." },
        { status: 400 },
      );
    }

    const verdict = await adjudicate(jobId, spec, deliverable);
    return NextResponse.json({ verdict });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Adjudication failed." },
      { status: 500 },
    );
  }
}
