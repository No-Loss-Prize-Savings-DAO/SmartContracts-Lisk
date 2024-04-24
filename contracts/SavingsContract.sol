// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDAOGovernance.sol";
import "./interfaces/IRegulatoryCompliance.sol";
import "./interfaces/INFTContract.sol";
import "./interfaces/IDAOGovernance.sol";

contract SavingsContract is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public contractToken;
    IRegulatoryCompliance public regulatoryCompliance;
    INFTContract public nftContract;
    address public daoGovernanceAddress;

    address[] public userAddresses;
    mapping(address => User) public users;
    mapping(address => bool) private addressExists;
    uint256 contractBalance;

    struct User {
        uint256 slots;
        bool isDAO;
        uint256 balance;
    }

    constructor(address _contractTokenAddress, address _regulatoryComplianceAddress, address _nftContractAddress) Ownable(msg.sender) {
        contractToken = IERC20(_contractTokenAddress);
        regulatoryCompliance = IRegulatoryCompliance(_regulatoryComplianceAddress);
        nftContract = INFTContract(_nftContractAddress);
    }

    // Function to add the DAO Governance address
    function addDAOGovernanceAddress(address _daoGovernanceAddress) external onlyOwner {
        daoGovernanceAddress = _daoGovernanceAddress;
    }

    function deposit(uint256 amount) public {
        contractToken.safeTransferFrom(msg.sender, address(this), amount);
        if (users[msg.sender].balance == 0 && !addressExists[msg.sender]) {
            userAddresses.push(msg.sender);
            addressExists[msg.sender] = true;
        }
        users[msg.sender].balance += amount;
        contractBalance += amount;
        users[msg.sender].slots = users[msg.sender].balance / 100;

        if (!users[msg.sender].isDAO && users[msg.sender].balance >= 3000) {
            regulatoryCompliance.sendAgreements("New DAO");
        }
    }

    function withdraw(uint256 amount) public {
        require(users[msg.sender].balance >= amount, "Insufficient balance");
        require(!users[msg.sender].isDAO || (users[msg.sender].isDAO && users[msg.sender].balance - amount >= 3000),
            "DAO members must maintain at least 3000 tokens");

        users[msg.sender].balance -= amount;
        contractBalance -= amount;
        // TO-DO remove user from array of userAddresses once balance goes below 100 token
        users[msg.sender].slots = users[msg.sender].balance / 100;
        contractToken.safeTransfer(msg.sender, amount);

        // Update address existence status if the balance becomes zero
        if (users[msg.sender].balance == 0) {
            addressExists[msg.sender] = false;
        }
    }

    function forfeitDAO(uint256 tokenId) public {
        require(users[msg.sender].isDAO, "Not a DAO member");
        nftContract.burn(tokenId);
        users[msg.sender].isDAO = false;
    }

    function acceptIntoDAO(address user) external {
        require(msg.sender == daoGovernanceAddress, "Only DAO Governance can accept users");
        users[user].isDAO = true;
        nftContract.mint(user);
    }

    function fetchAddressesBySlots() public view returns (address[] memory sortedAddresses) {
        uint256 totalSlots = getTotalSlots();

        sortedAddresses = new address[](totalSlots);
        uint256 counter = 0;

        for (uint256 i = 0; i < userAddresses.length; i++) {
            address user = userAddresses[i];
            for (uint256 j = 0; j < users[user].slots; j++) {
                sortedAddresses[counter++] = user;
            }
        }

        return sortedAddresses;
    }

    function getTotalSlots() public view returns (uint256) {
        uint256 totalSlots = 0;
        for (uint256 i = 0; i < userAddresses.length; i++) {
            totalSlots += users[userAddresses[i]].slots;
        }

        return totalSlots;
    }

    function transferFund(address to, uint256 amount) external {
        contractToken.safeTransfer(to, amount);
    }

    function isDAO(address user) external view returns (bool) {
        return users[user].isDAO;
    }

    function getBalance(address user) external view returns (uint256) {
        return users[user].balance;
    }

    function withdrawToken(uint256 amount) external onlyOwner() {
        require(contractBalance >= amount, "Insufficient balance in contract");
        contractBalance -= amount;
        contractToken.safeTransfer(msg.sender, amount);
    }

    // TO-DO implement a returnToken function for owner to return the withdrawn amount back without incrementing owners' balance
    // TO-DO implement a lock period between when the owner withdraws the token for a transaction and when it is returned.
}