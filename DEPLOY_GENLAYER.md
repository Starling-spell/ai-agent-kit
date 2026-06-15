# Deploying the `AgentRegistry` contract (live AI mode)

By default the app runs in **mock AI mode** — decisions come from a transparent
local heuristic, so nothing here is required. Follow this to switch agent
decisions to **real GenLayer validator consensus**.

The contract is [`contracts/agent_registry.py`](contracts/agent_registry.py).
Its security review is in [`AUDIT.md`](AUDIT.md).

---

## 1. Get a GenLayer testnet account
Create/keystore a GenLayer account and fund it from the testnet faucet. The
fastest path is the **GenLayer Studio**: <https://studio.genlayer.com>.

## 2. Deploy the contract

**Option A — Studio (zero setup, recommended):**
1. Open <https://studio.genlayer.com>.
2. New contract → paste the contents of `contracts/agent_registry.py`.
3. Deploy. Copy the deployed **contract address**.

**Option B — `genlayer-dev` Claude Code plugin:**
```bash
claude /plugin marketplace add genlayerlabs/skills
# then, in this repo:
claude "use genlayer-dev to deploy contracts/agent_registry.py to testnet"
```
The skill scaffolds, lints, runs the direct-mode tests, and deploys.

**Option C — GenLayer CLI / `genlayer-js`:**
Use the CLI (`genlayer`) or the JS SDK to deploy `agent_registry.py`. See the
[genlayer-js](https://docs.genlayer.com/api-references/genlayer-js) reference.

## 3. Run the contract tests (optional but recommended)
```bash
pip install genlayer-test      # or use the genlayer-dev plugin
pytest tests/direct/ -v
```

## 4. Wire the app to live mode
Set these (in `.env.local` for local dev, or Vercel → Settings → Environment
Variables), then redeploy:

```
AI_MODE=live
GENLAYER_CONTRACT_ADDRESS=0x...   # from step 2
GENLAYER_CHAIN=testnetAsimov      # or your target testnet
GENLAYER_PRIVATE_KEY=0x...        # signer that pays for decision txs
```

The live adapter is already implemented in [`lib/genlayer.ts`](lib/genlayer.ts):
it calls `decide(agentId, runId, instructions, input, action)` and polls
`get_response(runId)` for the finalized verdict. `genlayer-js` is loaded lazily,
so you only need it when going live:
```bash
npm install genlayer-js
```

## Notes
- Keep `GENLAYER_PRIVATE_KEY` in a secret manager / KMS for anything beyond a
  pilot — never commit it.
- `decide` is public (callers pay gas); add off-chain rate limiting before
  exposing it widely (see AUDIT.md finding 6).
- Stay on testnet until an external audit is done.
