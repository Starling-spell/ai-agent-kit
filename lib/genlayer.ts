import { config } from "./config";
import type { Verdict } from "./types";

// ============================================================
//  GenLayer adapter — the AI "brain".
//  Decides whether a submitted deliverable meets the natural-
//  language acceptance criteria. Mock by default; live mode
//  calls the deployed EscrowAdjudicator Intelligent Contract.
// ============================================================

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "must", "should", "shall",
  "have", "has", "will", "your", "from", "into", "they", "them", "then",
  "are", "was", "were", "a", "an", "of", "to", "in", "on", "it", "is", "be",
  "as", "at", "or", "by", "we", "you", "all", "any", "can",
]);

function keywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    ),
  );
}

/**
 * Transparent heuristic that stands in for GenLayer's AI-validator consensus.
 * It checks how much of the spec's vocabulary the deliverable covers and
 * whether the submission is substantive. Deterministic and explainable so the
 * demo behaves sensibly without any LLM/API key.
 */
function mockAdjudicate(spec: string, deliverable: string): Verdict {
  const specKeys = keywords(spec);
  const text = deliverable.toLowerCase();
  const matched = specKeys.filter((k) => text.includes(k));
  const missing = specKeys.filter((k) => !text.includes(k));

  const coverage = specKeys.length ? matched.length / specKeys.length : 0;
  const substantive = deliverable.trim().length >= 40;
  const meetsSpec = coverage >= 0.5 && substantive;

  const confidence = Math.min(
    99,
    Math.max(40, Math.round(coverage * 100) - (substantive ? 0 : 25)),
  );

  let reasoning: string;
  if (!substantive) {
    reasoning =
      "The deliverable is too thin to evaluate against the acceptance criteria; it reads as incomplete.";
  } else if (meetsSpec) {
    reasoning = `The deliverable addresses ${matched.length}/${specKeys.length} of the key requirements (${matched
      .slice(0, 6)
      .join(", ")}). It satisfies the acceptance criteria.`;
  } else {
    reasoning = `The deliverable misses key requirements${
      missing.length ? `: ${missing.slice(0, 6).join(", ")}` : ""
    }. It does not yet satisfy the acceptance criteria.`;
  }

  return { meetsSpec, confidence, reasoning, source: "mock" };
}

/**
 * Live mode: submit the dispute to the GenLayer EscrowAdjudicator contract and
 * read back the consensus verdict. genlayer-js is imported via a runtime-
 * resolved specifier so it is never required for a mock-mode build/deploy.
 *
 * Enable with: `npm install genlayer-js` and ADJUDICATOR_MODE=live.
 */
async function liveAdjudicate(
  jobId: string,
  spec: string,
  deliverable: string,
): Promise<Verdict> {
  const { contractAddress, privateKey } = config.genlayer;
  if (!contractAddress || !privateKey) {
    throw new Error(
      "Live adjudication needs GENLAYER_CONTRACT_ADDRESS and GENLAYER_PRIVATE_KEY.",
    );
  }

  let gljs: any;
  let chains: any;
  try {
    const sdk = "genlayer-js";
    const sdkChains = "genlayer-js/chains";
    gljs = await import(/* webpackIgnore: true */ sdk);
    chains = await import(/* webpackIgnore: true */ sdkChains);
  } catch {
    throw new Error(
      "Live mode requires the genlayer-js SDK. Run `npm install genlayer-js`.",
    );
  }

  const client = gljs.createClient({
    chain: chains[config.genlayer.chain],
    account: gljs.createAccount(privateKey),
  });

  // 1) Submit the deliverable for adjudication (write tx → consensus).
  await client.writeContract({
    address: contractAddress,
    functionName: "adjudicate",
    args: [jobId, spec, deliverable],
    value: 0n,
  });

  // 2) Poll the view method until the verdict is finalized.
  for (let i = 0; i < 30; i++) {
    const raw: string = await client.readContract({
      address: contractAddress,
      functionName: "get_verdict",
      args: [jobId],
    });
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        meetsSpec: Boolean(parsed.meets_spec),
        confidence: Number(parsed.confidence ?? 0),
        reasoning: String(parsed.reasoning ?? ""),
        source: "genlayer",
      };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for GenLayer verdict finality.");
}

export async function adjudicate(
  jobId: string,
  spec: string,
  deliverable: string,
): Promise<Verdict> {
  if (config.adjudicatorMode === "live") {
    return liveAdjudicate(jobId, spec, deliverable);
  }
  // Simulate consensus latency so the UI lifecycle feels real.
  await new Promise((r) => setTimeout(r, 700));
  return mockAdjudicate(spec, deliverable);
}
