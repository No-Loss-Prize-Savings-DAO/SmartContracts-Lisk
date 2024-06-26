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
    IDAOGovernance daoGovernance;
    address daoGovernanceAddress;
    address prizeDistributionAddress;

    // User-related mappings and arrays
    address[] userAddresses;
    mapping(address => User) public users;
    mapping(address => bool) private addressExists;
    mapping(uint256 => bool) amountWithdrawn;
    mapping(address => bool) agreementSent;

    // Contract balance
    uint256 totalStableCoinBalance;
    uint256 totalContractTokenBalance;

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
    event OwnerWithdraw(address indexed user, uint256 proposalId, uint256 amount);
    event OwnerRefund(address indexed user, uint256 proposalId, uint256 amount);
    event AirdropDistributed(address indexed recipient, uint256 amount);
    event AgreementSent(address indexed user);

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
        daoGovernance = IDAOGovernance(_daoGovernanceAddress);
        prizeDistributionAddress = _prizeDistributionAddress;
    }

    function deposit(uint256 amount) external {
        stableCoin.safeTransferFrom(msg.sender, address(this), amount);
        _depositStableCoin(msg.sender, amount);
    }

    function depositContractToken(uint256 amount) external {
        contractToken.safeTransferFrom(msg.sender, address(this), amount);
        users[msg.sender].contractTokenBalance += amount;
        totalContractTokenBalance += amount;
        emit ContractTokenDeposited(msg.sender, amount);
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
            users[msg.sender].slots = 0;
            agreementSent[msg.sender] = false;
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

        if (!users[user].isDAO && users[user].stableCoinBalance >= 3000e6 && !agreementSent[user]) {
            agreementSent[user] = true;
            regulatoryCompliance.sendAgreements("New DAO");

            // I understand the below will be implemented for both users and DAO. It is necessary to 
            // avoid redundant call to check the status of the voting process for a new proposal.
            // It doesn't however stop the user from withdrawing as there is no check for them.
            users[user].daoLockExpiry = block.timestamp + (1 * 365 days);
            emit AgreementSent(user);
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
        uint256 daoSlots = totalDAOSlots();
        uint256 _arraySize = totalSlots - daoSlots;

        sortedAddresses = new address[](_arraySize);
        uint256 counter = 0;

        for (uint256 i = 0; i < userAddresses.length; i++) {
            address user = userAddresses[i];
            // Check if the user is not a DAO member
            if (!users[user].isDAO) {
                // If the user is not a DAO member, add them to the sortedAddresses array
                for (uint256 j = 0; j < users[user].slots; j++) {
                    sortedAddresses[counter++] = user;
                }
            }
        }

        return sortedAddresses;
    }

    function totalDAOSlots() public view returns(uint256) {
        uint256 _totalDAOSlots = 0;
        for (uint256 i = 0; i < userAddresses.length; i++) {
            address user = userAddresses[i];
            if (users[user].isDAO) {
                _totalDAOSlots += users[userAddresses[i]].slots;
            }
        }
        return _totalDAOSlots;
    }

    function fetchUserAddresses() external view returns (address[] memory) {
        return userAddresses;
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

    function isAgreementSent(address user) external view returns (bool) {
        return agreementSent[user];
    }

    function getUserBalance(address user) public view returns (uint256 stableCoinBalance, uint256 contractTokenBalance) {
        return (users[user].stableCoinBalance, users[user].contractTokenBalance);
    }

    function getContractBalance() external view returns (uint256 stableCoinBalance, uint256 contractTokenBalance) {
        return (totalStableCoinBalance, totalContractTokenBalance);
    }

    function withdrawAmount(uint256 proposalId, uint256 amount) external onlyOwner() {
        uint256 maxWithdrawalAmount = (totalStableCoinBalance * 60) / 100;
        require(amount <= maxWithdrawalAmount, "Withdrawal amount exceeds the maximum allowed");
        require(totalStableCoinBalance >= amount, "Insufficient stableToken balance in contract");
        ( , , , , , bool acceptWithdrawal) = daoGovernance.getProposalStatus(proposalId);
        require(!(amountWithdrawn[proposalId]), "Amount already withdrawn for this proposal");
        require(acceptWithdrawal, "Proposal was not accepted");

        totalStableCoinBalance -= amount;
        amountWithdrawn[proposalId] = true;
        stableCoin.safeTransfer(msg.sender, amount);
        emit OwnerWithdraw(msg.sender, proposalId, amount);
    }

    function refundWithdrawnAmount(uint256 proposalId, uint256 amount) external onlyOwner() {
        totalStableCoinBalance += amount;
        stableCoin.safeTransferFrom(msg.sender, address(this), amount);
        emit OwnerRefund(msg.sender, proposalId, amount);
    }

    function distributeAirdrop(uint256 amount) external onlyOwner {
        uint256 totalSlots = 0;
        // Calculate total slots
        for (uint256 i = 0; i < userAddresses.length; i++) {
            address member = userAddresses[i];
            (uint256 balance, ) = getUserBalance(member);
            // For every $20 deposited, the user has one slot
            uint256 slots = balance / 20e6;
            totalSlots += slots;
        }

        // Calculate the amount per slot
        uint256 amountPerSlot = amount / totalSlots;

        // Distribute the airdrop amount to each user based on their slots
        for (uint256 i = 0; i < userAddresses.length; i++) {
            address member = userAddresses[i];
            (uint256 balance, ) = getUserBalance(member);
            uint256 slots = balance / 20e6;
            uint256 allocatedAirdrop = amountPerSlot * slots;
            contractToken.safeTransfer(member, allocatedAirdrop);

            emit AirdropDistributed(member, allocatedAirdrop);
        }
    }
}