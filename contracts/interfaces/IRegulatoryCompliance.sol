// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRegulatoryCompliance {
    function sendAgreements(string calldata key) external;

    function acceptAgreement() external;
}