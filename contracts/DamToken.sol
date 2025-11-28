pragma solidity ^0.6.0;

import "./OpenZeppelin/ERC777.sol";

contract DamToken is ERC777 {
    constructor () public ERC777("Datamine", "DAM", new address[](0)) {
        _mint(msg.sender, 25000000 * (10 ** 18), "", "");
    }
}