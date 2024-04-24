// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INFTContract {
    function mint(address to) external returns (uint256);

    function burn(uint256 tokenId) external;
}