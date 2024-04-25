// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ComplianceDatabase is Ownable {
    mapping(string => string) public userRegulations;
    mapping(string => string) public daoRegulations;

    constructor() Ownable(msg.sender) {
        // Initialize user regulations
        userRegulations["AML/KYC"] = "Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations require us to verify your identity and monitor transactions to prevent illegal activities such as money laundering and terrorist financing.";
        userRegulations["Securities"] = "Securities regulations govern the sale and distribution of investment products, including digital assets such as tokens. Compliance with these regulations helps protect investors and ensures fair and transparent markets.";
        userRegulations["Tax"] = "Tax regulations govern the taxation of cryptocurrency transactions, including buying, selling, and trading digital assets. Understanding your tax obligations is important to ensure compliance with the law.";

        // Initialize DAO regulations
        daoRegulations["New DAO"] = "A lock period will be initiated for an amount of $3000 for one year. All DAOs gets to share 30% of the total complete on each prize distribution. A DAO can earn more when his proposal is accepted. Before proposing a business idea within the DAO, members should conduct thorough due diligence to assess potential risks and ensure the viability of the proposal. DAO funds are at risk, and improper proposals may lead to losses for the community. Members found to have knowingly proposed fraudulent or risky ventures may face penalties, including loss of tokens or expulsion from the DAO.";
    }

    function addUserRegulation(string calldata key, string calldata regulation) external onlyOwner {
        userRegulations[key] = regulation;
    }

    function addDAORegulation(string calldata key, string calldata regulation) external onlyOwner {
        daoRegulations[key] = regulation;
    }

    function getUserRegulation(string calldata key) external view returns (string memory) {
        return userRegulations[key];
    }

    function getDAORegulation(string calldata key) external view returns (string memory) {
        return daoRegulations[key];
    }
}