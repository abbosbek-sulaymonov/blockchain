// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Greeter
/// @notice The "hello world" of Solidity. Read it first — every other contract in this repo
///         assumes you understand what is happening here.
/// @dev Teaching points:
///      - `string public greeting` auto-generates a free `greeting()` view getter.
///      - Writing to storage costs gas; reading from a `view` function off-chain is free.
///      - Events are the only cheap way to tell the outside world that something happened.
contract Greeter {
    /// @notice The current greeting. Anyone can read it, only `setGreeting` can change it.
    string public greeting;

    /// @notice The address that deployed this contract.
    address public immutable deployer;

    /// @notice How many times the greeting has been changed.
    uint256 public changeCount;

    /// @notice Emitted whenever the greeting changes.
    /// @dev `indexed` params are searchable in logs — that is how the indexer in `apps/api` finds them.
    event GreetingChanged(address indexed author, string oldGreeting, string newGreeting);

    /// @notice Thrown when someone tries to set an empty greeting.
    error EmptyGreeting();

    constructor(string memory initialGreeting) {
        greeting = initialGreeting;
        deployer = msg.sender;
    }

    /// @notice Replace the greeting.
    /// @param newGreeting The new greeting. Must not be empty.
    function setGreeting(string calldata newGreeting) external {
        if (bytes(newGreeting).length == 0) {
            revert EmptyGreeting();
        }

        string memory oldGreeting = greeting;
        greeting = newGreeting;
        changeCount += 1;

        emit GreetingChanged(msg.sender, oldGreeting, newGreeting);
    }
}
