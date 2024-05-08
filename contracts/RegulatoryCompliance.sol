// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDAOGovernance.sol";
import "./interfaces/IComplianceDatabase.sol";
import "./interfaces/ISavingsContract.sol";

contract RegulatoryCompliance is Ownable {
    IDAOGovernance public daoGovernance;
    address public savingsContractAddress;
    IComplianceDatabase complianceDatabase;
    ISavingsContract savingsContract;
    mapping(address => bool) public agreementStatus;
    mapping(address => bool) public userResponded;

    event AgreementSent(address indexed user, string key);
    event AgreementStatus(address indexed user, bool response);

    constructor(address _complianceDatabaseAddress) Ownable(msg.sender) {
        complianceDatabase = IComplianceDatabase(_complianceDatabaseAddress);
    }

    // Function to add the DAO Governance address
    function bindAddresses(address _daoGovernanceAddress, address _savingsContractAddress) external onlyOwner {
        daoGovernance = IDAOGovernance(_daoGovernanceAddress);
        savingsContractAddress = _savingsContractAddress;
        savingsContract = ISavingsContract(_savingsContractAddress);
    }

    function sendAgreements(string calldata key) external {
        require(msg.sender == savingsContractAddress, "Only savings contract can call this function");
        complianceDatabase.getDAORegulation(key);
        emit AgreementSent(msg.sender, key);
    }

    function acceptAgreement() external {
        require(savingsContract.isAgreementSent(msg.sender), "You can't call this function");
        require(!userResponded[msg.sender], "You responded already");

        userResponded[msg.sender] = true;
        agreementStatus[msg.sender] = true;
        daoGovernance.proposeMembership(msg.sender);
        emit AgreementStatus(msg.sender, true);
    }

    function rejectAgreement() external {
        require(savingsContract.isAgreementSent(msg.sender), "You can't call this function");
        require(!userResponded[msg.sender], "You responded already");

        userResponded[msg.sender] = true;
        agreementStatus[msg.sender] = false;
        emit AgreementStatus(msg.sender, false);
    }
}