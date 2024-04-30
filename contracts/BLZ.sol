// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BLZ is ERC20, Ownable {
    string _name = "Blitz";
    string _symbol = "BLZ";
    uint8 _decimals = 18;

    constructor() ERC20(_name, _symbol) Ownable(msg.sender) {
        _mint(msg.sender, 400000000 * 10 ** _decimals);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}