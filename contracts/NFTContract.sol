// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"; // Import ERC721URIStorage
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTContract is ERC721URIStorage, Ownable { // Inherit from ERC721URIStorage
    uint256 private _tokenIdCounter;
    address savingsContractAddress;
    string _tokenURI = "ipfs://bafybeidpcq2sdlhc26axzaazrk5jnbxdxkqctu6oqu7t4wv2eknyaqtjua/0.png";

    constructor() ERC721("DAO Membership NFT", "DAONFT") Ownable(msg.sender) {}

    function addSavingsContractAddress(address _savingsContractAddress) external onlyOwner() {
        savingsContractAddress = _savingsContractAddress;
    }

    function mint(address to) public returns (uint256) {
        require(msg.sender == savingsContractAddress, "Only savings contract can call this function");
        uint256 newTokenId = _tokenIdCounter + 1; // Increment tokenId
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, _tokenURI); // Set metadata URI for the token
        _tokenIdCounter = newTokenId; // Update tokenId counter
        return newTokenId;
    }

    function burn(uint256 tokenId) public {
        require(msg.sender == savingsContractAddress, "Only savings contract can call this function");
        _burn(tokenId);
    }
}