"""
Direct-mode tests for EscrowAdjudicator — fast, in-memory, no server needed.

Run with:  pytest tests/direct/ -v

The non-deterministic LLM call is mocked so the test is deterministic. See the
GenLayer testing docs for the full fixtures available in direct mode.
"""

import json


def test_passing_deliverable(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/escrow_adjudicator.py")
    direct_vm.sender = direct_alice

    # Mock the validator consensus to return a passing verdict.
    direct_vm.mock_prompt(
        json.dumps({"meets_spec": True, "confidence": 88, "reasoning": "Looks complete."})
    )

    contract.adjudicate("job-1", "Build a responsive hero section.", "Delivered a responsive hero section with CTA.")

    verdict = json.loads(contract.get_verdict("job-1"))
    assert verdict["meets_spec"] is True
    assert verdict["confidence"] == 88


def test_unadjudicated_job_is_empty(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/escrow_adjudicator.py")
    direct_vm.sender = direct_alice
    assert contract.get_verdict("never-seen") == ""
