// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDAOGovernance {
    function proposeMembership(address user) external;
    function proposeActivity(string memory description) external;
    function voteOnProposal(uint256 proposalId, bool support) external;
    function getProposalStatus(uint256 proposalId) external view returns (string memory description, uint256 totalVotes, uint256 requiredVotes, bool active);
    function addMember(address member) external;
    function removeMember(address member) external;
    function getCurrentProposer() external view returns (address);
    function getNumberOfMembers() external view returns (uint256);
    function getDAOAddresses() external view returns (address[] memory);
}