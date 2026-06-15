// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentActions
/// @notice Append-only, on-chain log of agent decisions for the GenLayer Agent
///         Studio. Testnet logbook: it holds no funds and makes no external
///         calls. Anyone may log an action (the caller pays gas), which is the
///         intended behavior for a public activity feed.
/// @dev    Reviewed in ../../AUDIT.md.
contract AgentActions {
    event ActionLogged(
        address indexed agent,
        bytes32 indexed runId,
        string agentName,
        string action,
        string memo,
        uint256 index
    );

    /// @notice Total actions ever logged (also the next index).
    uint256 public totalActions;

    /// @notice Number of actions logged by a given caller.
    mapping(address => uint256) public actionCountOf;

    /// @notice Record an agent action. Emits {ActionLogged}.
    /// @return index The global index assigned to this action.
    function logAction(
        string calldata agentName,
        string calldata action,
        string calldata memo,
        bytes32 runId
    ) external returns (uint256 index) {
        index = totalActions;
        unchecked {
            // 2^256 actions is unreachable in practice; unchecked saves gas.
            totalActions = index + 1;
            actionCountOf[msg.sender] += 1;
        }
        emit ActionLogged(msg.sender, runId, agentName, action, memo, index);
    }
}
