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

    // Tokens
    IERC20 public stableCoin;
    IERC20 public contractToken;

    // Contracts
    IRegulatoryCompliance regulatoryCompliance;
    INFTContract nftContract;
    address daoGovernanceAddress;
    address prizeDistributionAddress;

    // User-related mappings and arrays
    address[] public userAddresses;
    mapping(address => User) public users;
    mapping(address => bool) private addressExists;

    // Contract balance
    uint256 public totalStableCoinBalance;
    uint256 public totalContractTokenBalance;

    struct User {
        uint256 stableCoinBalance;
        uint256 contractTokenBalance;
        uint256 slots;
        bool isDAO;
        uint256 daoLockExpiry;
    }

    // Events
    event StableCoinDeposited(address indexed user, uint256 amount);
    event ContractTokenDeposited(address indexed user, uint256 amount);
    event StableCoinWithdrawn(address indexed user, uint256 amount);
    event ContractTokenWithdrawn(address indexed user, uint256 amount);
    event ActivityTracker(address indexed user, uint256 amount);

    constructor(
        address _stableCoinAddress,
        address _contractTokenAddress,
        address _regulatoryComplianceAddress,
        address _nftContractAddress
    ) Ownable(msg.sender) {
        stableCoin = IERC20(_stableCoinAddress);
        contractToken = IERC20(_contractTokenAddress);
        regulatoryCompliance = IRegulatoryCompliance(_regulatoryComplianceAddress);
        nftContract = INFTContract(_nftContractAddress);
    }

    function bindAddress(address _daoGovernanceAddress, address _prizeDistributionAddress) external onlyOwner {
        daoGovernanceAddress = _daoGovernanceAddress;
        prizeDistributionAddress = _prizeDistributionAddress;
    }

    function deposit(uint256 amount) external {
        stableCoin.safeTransferFrom(msg.sender, address(this), amount);
        _depositStableCoin(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(users[msg.sender].stableCoinBalance >= amount, "Insufficient stable coin balance");
        require(!users[msg.sender].isDAO || (users[msg.sender].isDAO && users[msg.sender].stableCoinBalance - amount >= 3000e6), 
            "DAO members must forfeit DAO membership to withdraw funds");
            
        users[msg.sender].stableCoinBalance -= amount;
        totalStableCoinBalance -= amount;
        stableCoin.safeTransfer(msg.sender, amount);

        // Remove user from array if stable coin balance is 0
        if (users[msg.sender].stableCoinBalance == 0) {
            _removeUser(msg.sender);
        }

        emit StableCoinWithdrawn(msg.sender, amount);
    }

    function withdrawContractToken(uint256 amount) external {
        require(users[msg.sender].contractTokenBalance >= amount, "Insufficient contract token balance");
        users[msg.sender].contractTokenBalance -= amount;
        totalContractTokenBalance -= amount;
        contractToken.safeTransfer(msg.sender, amount);
        emit ContractTokenWithdrawn(msg.sender, amount);
    }

    function _depositStableCoin(address user, uint256 amount) private {
        if (users[user].stableCoinBalance == 0 && !addressExists[user]) {
            userAddresses.push(user);
            addressExists[user] = true;
        }
        users[user].stableCoinBalance += amount;
        totalStableCoinBalance += amount;
        users[user].slots = users[user].stableCoinBalance / 100e6;

        if (!users[user].isDAO && users[user].stableCoinBalance >= 3000e6) {
            regulatoryCompliance.sendAgreements("New DAO");
            users[user].daoLockExpiry = block.timestamp + (1 * 365 days);
        }
        emit StableCoinDeposited(user, amount);
    }

    function _removeUser(address user) private {
        addressExists[user] = false;
        for (uint256 i = 0; i < userAddresses.length; i++) {
            if (userAddresses[i] == user) {
                userAddresses[i] = userAddresses[userAddresses.length - 1];
                userAddresses.pop();
                break;
            }
        }
    }

    function forfeitDAO(uint256 tokenId) external {
        require(users[msg.sender].isDAO, "Not a DAO member");
        require(block.timestamp >= users[msg.sender].daoLockExpiry, "DAO lock period has not expired");

        nftContract.burn(tokenId);
        users[msg.sender].isDAO = false;
    }

    function acceptIntoDAO(address user) external {
        require(msg.sender == daoGovernanceAddress, "Only DAO Governance can accept users");
        users[user].isDAO = true;
        nftContract.mint(user);
    }

    function fetchAddressesBySlots() external view returns (address[] memory sortedAddresses) {
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

    function fetchUserAddresses() external view returns (address[] memory uniqueUserAddresses) {
        uint256 totalAddresses = userAddresses.length;

        uniqueUserAddresses = new address[](totalAddresses);
        uint256 counter = 0;

        for (uint256 i = 0; i < userAddresses.length; i++) {
            uniqueUserAddresses[counter++] = userAddresses[i];
        }

        return uniqueUserAddresses;
    }

    function getTotalSlots() public view returns (uint256) {
        uint256 totalSlots = 0;
        for (uint256 i = 0; i < userAddresses.length; i++) {
            totalSlots += users[userAddresses[i]].slots;
        }
        return totalSlots;
    }

    function transferFund(address to, uint256 amount) external {
        require(msg.sender == prizeDistributionAddress, "Only prizeDistribution contract can call this function");
        contractToken.safeTransfer(to, amount);
    }

    function isDAO(address user) external view returns (bool) {
        return users[user].isDAO;
    }

    function getUserBalance(address user) external view returns (uint256 stableCoinBalance, uint256 contractTokenBalance) {
        return (users[user].stableCoinBalance, users[user].contractTokenBalance);
    }

    function getContractBalance() external view returns (uint256 stableCoinBalance, uint256 contractTokenBalance) {
        return (totalStableCoinBalance, totalContractTokenBalance);
    }

    function withdrawAmount(uint256 amount) external onlyOwner() {
        uint256 maxWithdrawalAmount = (totalStableCoinBalance * 60) / 100;
        require(amount <= maxWithdrawalAmount, "Withdrawal amount exceeds the maximum allowed");
        require(totalStableCoinBalance >= amount, "Insufficient stableToken balance in contract");

        totalStableCoinBalance -= amount;
        stableCoin.safeTransfer(msg.sender, amount);
        emit ActivityTracker(msg.sender, amount);
    }

    function refundWithdrawnAmount(uint256 amount) external onlyOwner() {
        totalStableCoinBalance += amount;
        stableCoin.safeTransferFrom(msg.sender, address(this), amount);
        emit ActivityTracker(msg.sender, amount);
    }
}