import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verify a SIWE signature against the issued nonce, then mint a session cookie.
export async function POST(req: Request) {
  try {
    const { address, message, signature } = await req.json();
    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: "address, message and signature are required" },
        { status: 400 },
      );
    }

    const nonce = cookies().get("siwe-nonce")?.value;
    if (!nonce || !String(message).includes(nonce)) {
      return NextResponse.json(
        { error: "invalid or expired nonce" },
        { status: 401 },
      );
    }

    const ok = await verifyMessage({ address, message, signature });
    if (!ok) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
    }

    const { token, maxAge } = createSession(address);
    const res = NextResponse.json({ address: String(address).toLowerCase() });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
    res.cookies.set("siwe-nonce", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "verification failed" },
      { status: 500 },
    );
  }
}
