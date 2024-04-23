// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IComplianceDatabase {
    function addUserRegulation(string calldata key, string calldata regulation) external;
    
    function addDAORegulation(string calldata key, string calldata regulation) external;

    function getUserRegulation(string calldata key) external view returns (string memory);

    function getDAORegulation(string calldata key) external view returns (string memory);
}