// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Sender.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";
 
interface ILockToken {
    function lock(address minterAddress, uint256 amount) external;
}

// This  contract is used to showcase that tokens can be received and sent from a smart contract
// This is useful for security researchers to test re-entrancy attacks
contract DamHolder is IERC777Sender, IERC777Recipient {

    event TokensToSendCalled(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData);
    event TokensReceivedCalled(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData);

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    constructor() public {
        _erc1820.setInterfaceImplementer(address(this), TOKENS_SENDER_INTERFACE_HASH, address(this));
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    /**
     * @dev This is THE "TOKENS SENT" HOOK. It is called by the ERC777 token
     * contract before it moves tokens from this contract's address.
     *
     * Here we just log both send/receive hooks for debugging
     *
     * @param operator The address which initiated the token transfer.
     * @param from The address which is sending tokens (this contract).
     * @param to The address which is receiving tokens.
     * @param amount The amount of tokens being transferred.
     * @param userData Data passed by the caller.
     * @param operatorData Data passed by the operator.
     */
    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        emit TokensToSendCalled(operator, from, to, amount, userData, operatorData);
    }

    
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        emit TokensReceivedCalled(operator, from, to, amount, userData, operatorData);
    }

    function authorizeOperator(address ercTokenAddress, address operatorAddress) public
    {
        IERC777 ercToken = IERC777(ercTokenAddress);
        ercToken.authorizeOperator(operatorAddress);
    }

    function lock(address lockableContractAddress, address mintAddress, uint256 lockAmount) public
    {
        ILockToken lockableContract = ILockToken(lockableContractAddress);
        lockableContract.lock(mintAddress, lockAmount);
    }

    // This contract must be able to receive tokens to have a balance to send.
    // We add a fallback function to accept Ether if needed, and the contract
    // can receive ERC777 tokens by default unless it implements a rejecting
    // `tokensReceived` hook.
    receive() external payable {}
}