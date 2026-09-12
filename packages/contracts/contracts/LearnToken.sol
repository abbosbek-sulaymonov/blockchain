// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LearnToken (LEARN)
/// @notice A plain ERC-20 used as the reward token for completing roadmap milestones.
/// @dev Teaching points:
///      - Inheriting OpenZeppelin's audited ERC20 instead of hand-rolling one. Do this in real life.
///      - Two access paths: the `owner` (a human) and the `minter` (the ProgressTracker contract).
///      - A cooldown-gated faucet, so a testnet learner can get tokens without begging the deployer.
contract LearnToken is ERC20, Ownable {
    /// @notice Tokens handed out per faucet claim (100 LEARN).
    uint256 public constant FAUCET_AMOUNT = 100e18;

    /// @notice How long an address must wait between faucet claims.
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    /// @notice Contract allowed to mint rewards. Set to the ProgressTracker after deployment.
    address public minter;

    /// @notice Last faucet claim timestamp per address.
    mapping(address account => uint256 timestamp) public lastClaimedAt;

    event MinterUpdated(address indexed previousMinter, address indexed newMinter);
    event FaucetClaimed(address indexed account, uint256 amount);

    error NotMinter(address caller);
    error FaucetCooldownActive(uint256 availableAt);

    /// @param initialOwner Address that will own the token (usually the deployer).
    constructor(address initialOwner) ERC20("Learn Token", "LEARN") Ownable(initialOwner) {}

    /// @dev Restricts a function to the configured minter contract.
    modifier onlyMinter() {
        if (msg.sender != minter) {
            revert NotMinter(msg.sender);
        }
        _;
    }

    /// @notice Point the token at the contract allowed to mint rewards.
    /// @dev Owner-only. In production you would use AccessControl roles instead of a single address.
    function setMinter(address newMinter) external onlyOwner {
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    /// @notice Mint reward tokens. Callable only by the ProgressTracker.
    function mintReward(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /// @notice Claim free tokens on a testnet. One claim per `FAUCET_COOLDOWN` per address.
    function claimFaucet() external {
        uint256 availableAt = lastClaimedAt[msg.sender] + FAUCET_COOLDOWN;
        if (lastClaimedAt[msg.sender] != 0 && block.timestamp < availableAt) {
            revert FaucetCooldownActive(availableAt);
        }

        lastClaimedAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}
