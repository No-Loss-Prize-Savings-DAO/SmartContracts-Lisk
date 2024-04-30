// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract USDT is ERC20, Ownable {
    string _name = "USD Tethers";
    string _symbol = "USDT";
    uint8 _decimals = 6;

    constructor() ERC20(_name, _symbol) Ownable(msg.sender) {
        _mint(msg.sender, 30000000 * 10 ** _decimals);
    }

    function decimals() public pure override returns(uint8){
        return 6;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}