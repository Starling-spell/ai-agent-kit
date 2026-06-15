"""
Direct-mode tests for AgentRegistry — fast, in-memory, deterministic.

Run with:  pytest tests/direct/ -v

The non-deterministic LLM call is mocked so results are reproducible. Fixture
names follow the GenLayer direct-execution test harness; adjust to your local
genlayer-test version if they differ.
"""

import json


def test_register_and_read(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy("contracts/agent_registry.py")
    direct_vm.sender = direct_alice

    agent_id = c.register_agent("Treasury Sentinel", "Approve only in-policy payouts.", "transfer")
    agent = json.loads(c.get_agent(agent_id))
    assert agent["name"] == "Treasury Sentinel"
    assert agent["action"] == "transfer"


def test_decide_enforces_action_allowlist(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy("contracts/agent_registry.py")
    direct_vm.sender = direct_alice

    # Model tries to return an action the caller never allowed -> coerced to "none".
    direct_vm.mock_prompt(
        json.dumps({"approved": True, "action": "drain", "confidence": 90, "reasoning": "ok"})
    )
    c.decide("agent-1", "run-1", "Be careful.", "Please pay invoice #42.", "transfer")

    verdict = json.loads(c.get_response("run-1"))
    assert verdict["approved"] is True
    assert verdict["action"] == "none"  # "drain" != allowed "transfer"
    assert 0 <= verdict["confidence"] <= 100


def test_run_id_is_write_once(direct_vm, direct_deploy, direct_alice):
    c = direct_deploy("contracts/agent_registry.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_prompt(json.dumps({"approved": True, "action": "none", "confidence": 50, "reasoning": "x"}))
    c.decide("agent-1", "run-1", "d", "input", "none")
    try:
        c.decide("agent-1", "run-1", "d", "input again", "none")
        assert False, "expected revert on reused run_id"
    except Exception:
        pass


def test_update_is_owner_gated(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = direct_deploy("contracts/agent_registry.py")
    direct_vm.sender = direct_alice
    agent_id = c.register_agent("A", "directive", "none")

    direct_vm.sender = direct_bob  # not the owner
    try:
        c.update_agent(agent_id, "Hijacked", "evil", "transfer")
        assert False, "expected revert: not agent owner"
    except Exception:
        pass
