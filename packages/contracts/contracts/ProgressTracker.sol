// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LearnToken} from "./LearnToken.sol";

/// @title ProgressTracker
/// @notice On-chain record of which roadmap milestones an address has completed.
/// @dev This is the contract the whole stack revolves around:
///      - `apps/web` writes to it with wagmi and reads it back with viem.
///      - `apps/api` indexes its `MilestoneCompleted` events into a queryable leaderboard.
///      Teaching points:
///      - A `uint256` bitmap stores 256 booleans in ONE storage slot. A `mapping(uint8 => bool)`
///        would cost a fresh slot per milestone. Gas layout is a design decision, not an afterthought.
///      - Custom errors are cheaper than `require` strings and decode nicely in viem/wagmi.
///      - Contract-to-contract calls: this contract mints a reward by calling LearnToken.
contract ProgressTracker {
    /// @notice Number of milestones in the roadmap. Milestone ids are 0..TOTAL_MILESTONES-1.
    uint8 public constant TOTAL_MILESTONES = 12;

    /// @notice Reward minted per completed milestone (10 LEARN).
    uint256 public constant REWARD_PER_MILESTONE = 10e18;

    /// @notice The reward token this contract is allowed to mint.
    LearnToken public immutable rewardToken;

    /// @notice Packed completion state: bit `n` of the bitmap means "milestone n done".
    mapping(address learner => uint256 bitmap) private _completedBitmap;

    /// @notice Total number of distinct learners who have completed at least one milestone.
    uint256 public learnerCount;

    event MilestoneCompleted(address indexed learner, uint8 indexed milestoneId, uint256 completedAt);
    event LearnerJoined(address indexed learner, uint256 joinedAt);

    error InvalidMilestone(uint8 milestoneId);
    error AlreadyCompleted(uint8 milestoneId);

    /// @param token Address of the deployed LearnToken.
    constructor(LearnToken token) {
        rewardToken = token;
    }

    /// @notice Mark a milestone complete for `msg.sender` and mint the reward.
    /// @param milestoneId Milestone index, 0-based, must be < TOTAL_MILESTONES.
    function completeMilestone(uint8 milestoneId) external {
        if (milestoneId >= TOTAL_MILESTONES) {
            revert InvalidMilestone(milestoneId);
        }

        uint256 bitmap = _completedBitmap[msg.sender];
        uint256 mask = 1 << milestoneId;

        if (bitmap & mask != 0) {
            revert AlreadyCompleted(milestoneId);
        }

        // Checks done, now effects: write storage BEFORE the external call (checks-effects-interactions).
        if (bitmap == 0) {
            learnerCount += 1;
            emit LearnerJoined(msg.sender, block.timestamp);
        }
        _completedBitmap[msg.sender] = bitmap | mask;

        emit MilestoneCompleted(msg.sender, milestoneId, block.timestamp);

        // Interaction last. If minting reverts the whole transaction rolls back — that is fine here.
        rewardToken.mintReward(msg.sender, REWARD_PER_MILESTONE);
    }

    /// @notice Whether `learner` has completed `milestoneId`.
    function hasCompleted(address learner, uint8 milestoneId) public view returns (bool) {
        if (milestoneId >= TOTAL_MILESTONES) {
            revert InvalidMilestone(milestoneId);
        }
        return _completedBitmap[learner] & (1 << milestoneId) != 0;
    }

    /// @notice Raw bitmap for `learner`. Useful for reading all 12 flags in a single RPC call.
    function completedBitmap(address learner) external view returns (uint256) {
        return _completedBitmap[learner];
    }

    /// @notice How many milestones `learner` has completed.
    function completedCount(address learner) external view returns (uint8 count) {
        uint256 bitmap = _completedBitmap[learner];
        for (uint8 i = 0; i < TOTAL_MILESTONES; ++i) {
            if (bitmap & (1 << i) != 0) {
                ++count;
            }
        }
    }

    /// @notice All 12 completion flags as an array — convenient for the frontend.
    function completionFlags(address learner) external view returns (bool[] memory flags) {
        uint256 bitmap = _completedBitmap[learner];
        flags = new bool[](TOTAL_MILESTONES);
        for (uint8 i = 0; i < TOTAL_MILESTONES; ++i) {
            flags[i] = bitmap & (1 << i) != 0;
        }
    }
}
