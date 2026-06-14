# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
EscrowAdjudicator — a GenLayer Intelligent Contract.

The "brain" of the agent kit. Given a freelance job's acceptance criteria and a
submitted deliverable, AI validators reach consensus on whether the deliverable
meets the spec. The off-chain orchestrator (the Vercel app) reads the verdict
and triggers the matching Arc USDC settlement.

Deploy with the GenLayer CLI or the `genlayer-dev` Claude Code plugin, then set
GENLAYER_CONTRACT_ADDRESS and ADJUDICATOR_MODE=live in the web app.
"""

from genlayer import *
import json


class EscrowAdjudicator(gl.Contract):
    # job_id -> JSON verdict string ({"meets_spec", "confidence", "reasoning"})
    verdicts: TreeMap[str, str]

    def __init__(self) -> None:
        self.verdicts = TreeMap()

    @gl.public.write
    def adjudicate(self, job_id: str, spec: str, deliverable: str) -> None:
        """Run AI-validator consensus on whether the deliverable meets the spec."""
        prompt = f"""
You are a neutral adjudicator settling a freelance escrow dispute.
Judge ONLY whether the submitted work satisfies the acceptance criteria.

ACCEPTANCE CRITERIA:
{spec}

SUBMITTED DELIVERABLE:
{deliverable}

Respond strictly as JSON:
{{"meets_spec": true/false, "confidence": 0-100, "reasoning": "one or two sentences"}}
"""

        def leader_fn():
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leaders_res) -> bool:
            # Validators agree if they independently reach the same pass/fail call.
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            mine = leader_fn()
            return bool(mine["meets_spec"]) == bool(leaders_res.calldata["meets_spec"])

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        self.verdicts[job_id] = json.dumps(result)

    @gl.public.view
    def get_verdict(self, job_id: str) -> str:
        """Return the JSON verdict, or '' if this job has not been adjudicated."""
        return self.verdicts.get(job_id, "")
