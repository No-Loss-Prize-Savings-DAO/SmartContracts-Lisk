// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract USDT is ERC20, Ownable {

    constructor(string memory _name, string memory _symbol, uint _decimals) ERC20(_name, _symbol) Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10 ** _decimals);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}