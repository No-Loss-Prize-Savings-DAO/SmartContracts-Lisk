// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISavingsContract {
    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function withdrawContractToken(uint256 amount) external;

    function forfeitDAO(uint256 tokenId) external;

    function acceptIntoDAO(address user) external;

    function fetchAddressesBySlots() external view returns (address[] memory sortedAddresses);

    function fetchUserAddresses() external view returns (address[] memory sortedAddresses);

    function getTotalSlots() external view returns (uint256);

    function totalDAOSlots() external view returns(uint256);

    function transferFund(address to, uint256 amount) external;

    function isDAO(address user) external view returns (bool);

    function isAgreementSent(address user) external view returns (bool);

    function getUserBalance(address user) external view returns (uint256 stableCoinBalance, uint256 contractTokenBalance);

    function getContractBalance() external view returns (uint256 stableCoinBalance, uint256 contractTokenBalance);
}