// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "hardhat/console.sol";

import "./OpenZeppelin/IERC1820Registry.sol";
import "./OpenZeppelin/IERC777Sender.sol";
import "./OpenZeppelin/IERC777Recipient.sol";
import "./OpenZeppelin/IERC777.sol";
 
// Basic functions that exist in ERC777 tokens
interface IERC777Token {

    function send(address recipient, uint256 amount, bytes calldata data) external;
    function balanceOf(address owner) external view returns (uint256);
}
interface ILockToken is IERC777Token  {
    function lock(address minterAddress, uint256 amount) external;
    function unlock() external;

}

// This  contract is used to showcase that tokens can be received and sent from a smart contract
// This is useful for security researchers to test re-entrancy attacks
contract DamBlockingHolder is IERC777Sender, IERC777Recipient {

    event TokensToSendHookExecuted(string message, address caller);
    event TokensReceivedHookExecuted(string message, address caller);

    enum UnitTestCase { CallUnlockTokensToSendHook, CallSendTokensToSendHook }
    UnitTestCase public unitTestCase;
    uint256 public hookSendAmount;

    enum UnitTestHookState { CallUnhooked, CallHooked }
    UnitTestHookState public unitTestHookState;

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    // Lockquidity token address
    ILockToken immutable private _lockableContractAddress;
    
    constructor(address lockableContractAddress) public {
        _lockableContractAddress = ILockToken(lockableContractAddress);

        _erc1820.setInterfaceImplementer(address(this), TOKENS_SENDER_INTERFACE_HASH, address(this));
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));

        unitTestHookState = UnitTestHookState.CallUnhooked;
    }

    function setUnitTestCase(UnitTestCase choice) public {
        unitTestCase = choice;
    }

    function setHookSendAmount(uint256 amount) public {
        hookSendAmount = amount;
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
        // In this hook we want to do two things:
        // 1. Try to unlock() while locking. This will silently fail due to _mutex
        // 2. Try to send() 100 DAM while also locking 100 DAM (original balance is 200 DAM)
        if (unitTestCase == UnitTestCase.CallUnlockTokensToSendHook) {

            // We'll only want to run this hook once, otherwise calling send() inside will re-trigger this hook (infinite loop)
            if (unitTestHookState == UnitTestHookState.CallUnhooked)
            {
                unitTestHookState = UnitTestHookState.CallHooked;

                // Try unlock() the tokens just as they are about to be locked (this shouild fail due to mutex protection)
                ILockToken lockableContract = ILockToken(_lockableContractAddress);
                lockableContract.unlock(); // This is 1st part of the test to make sure you can't unlock() while locking

                // msg.sender here will be damToken address as in DAM token is doing the spend
                // so we can say "What is the balance of DAM in this contract"
                uint256 thisAddressBalanceBeforeSend = IERC777Token(msg.sender).balanceOf(address(this));
                //console.log("-> thisAddressBalanceBeforeSend=%s, balance = %s",address(this),thisAddressBalanceBeforeSend);

                // Send 100 DAM (the same amount that is being locked) to a dead address (like permanent burning)
                IERC777Token damContract = IERC777Token(msg.sender);
                damContract.send(0x000000000000000000000000000000000000dEaD, hookSendAmount, "");   

                // Ok now  we want to make sure that the balance was properly reduced (you can see this through logs but we should assert for it here)
                uint256 thisAddressBalanceAfterSend = IERC777Token(msg.sender).balanceOf(address(this));
                //console.log("-> thisAddressBalanceAfterSend=%s, balance = %s",address(this),thisAddressBalanceAfterSend);

                // Uncomment below for easier debugging of addresses used
                //console.log("DamHolder tokensToSend hook executed");
                //console.log("  operator: %s", operator);
                //console.log("  from: %s", from);
                //console.log("  to: %s", to);
                //console.log("  amount: %s", amount);
                //console.log("  _lockableContractAddress=%s",address(_lockableContractAddress));
            }
        } else if (unitTestCase == UnitTestCase.CallSendTokensToSendHook) {

            if (unitTestHookState == UnitTestHookState.CallUnhooked)
            {
                unitTestHookState = UnitTestHookState.CallHooked;

                IERC777Token damContract = IERC777Token(msg.sender);
                damContract.send(0x000000000000000000000000000000000000dEaD, hookSendAmount, "");
            }
        }

        emit TokensToSendHookExecuted("DamBlockingHolder tokensToSend hook executed", msg.sender);
    }

    
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata,
        bytes calldata
    ) external override {

        emit TokensReceivedHookExecuted("DamBlockingHolder tokensToSend hook executed", msg.sender);
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
    function unlock() public
    {
        ILockToken lockableContract = ILockToken(_lockableContractAddress);
        lockableContract.unlock();
    }

    // This contract must be able to receive tokens to have a balance to send.
    // We add a fallback function to accept Ether if needed, and the contract
    // can receive ERC777 tokens by default unless it implements a rejecting
    // `tokensReceived` hook.
    receive() external payable {}
}