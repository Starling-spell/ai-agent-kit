# EVM contracts — `AgentActions`

[`AgentActions.sol`](AgentActions.sol) is an append-only, on-chain log of agent
decisions. When an agent approves an action, the app calls `logAction(...)` on
this contract (on the agent's testnet). It holds no funds and is safe to deploy
publicly. Reviewed in [`../../AUDIT.md`](../../AUDIT.md).

> Optional. With no address configured the app falls back to a 0-value memo
> self-transaction, so everything works without deploying this.

## Deploy (Remix, ~2 min, no toolchain)

1. Open <https://remix.ethereum.org>, create `AgentActions.sol`, paste the file.
2. **Compile** with Solidity `0.8.20+`.
3. **Deploy & Run** → Environment **"Injected Provider"** (your wallet) → select a
   testnet (e.g. **Base Sepolia**, fund from a faucet) → **Deploy**.
4. Copy the deployed address.

Repeat per testnet you want to support.

## Wire it up

Set one env var (JSON map of `chainId → address`) in `.env.local` or Vercel:

```
NEXT_PUBLIC_AGENT_ACTIONS={"84532":"0xYourBaseSepoliaAddress"}
```

Now approved actions call `logAction(agentName, action, memo, runId)` and emit an
`ActionLogged` event you can index. In **Suggest** mode your wallet signs it; in
**Autonomous** mode the agent's own wallet signs it.

## Foundry (alternative)
```bash
forge create contracts/evm/AgentActions.sol:AgentActions \
  --rpc-url <testnet-rpc> --private-key <deployer-key>
```
