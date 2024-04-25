// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISavingsContract.sol";

contract DAOGovernance is Ownable {
    struct Proposal {
        address proposer;
        string description;
        uint256 totalVotes;
        uint256 requiredVotes;
        bool active;
        mapping(address => bool) voted;
    }

    address[] daoAddresses;
    ISavingsContract savingsContract;
    address public regulatoryCompliance;
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public totalMembers;
    uint256 public totalVotingPower;
    address public acceptedDAO;

    event ProposalCreated(uint256 proposalId, string description);
    event Voted(uint256 proposalId, address voter, uint256 votes);
    event ProposalPassed(uint256 proposalId);
    event MemberAdded(address member);
    event MemberRemoved(address member);

    constructor(address _savingsContractAddress) Ownable(msg.sender) {
        savingsContract = ISavingsContract(_savingsContractAddress);
    }

    function bindAddress(address _regulatoryCompliance) external onlyOwner {
        regulatoryCompliance = _regulatoryCompliance;
    }

    function proposeMembership(address user) external {
        require(msg.sender == regulatoryCompliance, "Only regulatoryCompliance contract can call this function");
        createProposal(user, "New DAO Membership Proposal");
    }

    function proposeActivity(string memory description) external {
        require(savingsContract.isDAO(msg.sender), "Only DAO members can propose activity.");
        createProposal(msg.sender, description);
    }

    function createProposal(address proposer, string memory description) private {
        uint256 proposalId = ++proposalCount;
        // Initialize the proposal in storage
        Proposal storage proposal = proposals[proposalId];
        // Update the fields of the proposal individually
        proposal.proposer = proposer;
        proposal.description = description;
        proposal.totalVotes = 0;
        proposal.requiredVotes = totalVotingPower * 2 / 3;
        proposal.active = true;
        emit ProposalCreated(proposalId, description);
    }

    function voteOnProposal(uint256 proposalId, bool support) external {
        require(savingsContract.isDAO(msg.sender), "Only DAO members can vote");
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.voted[msg.sender], "Already voted");
        require(proposal.active, "Proposal is not active");

        (uint256 voterBalance, ) = savingsContract.getUserBalance(msg.sender);
        uint256 votes = voterBalance / 3000;

        if (support && votes > 0) {
            proposal.totalVotes += votes;
            emit Voted(proposalId, msg.sender, votes);

            if (proposal.totalVotes >= proposal.requiredVotes) {
                proposal.active = false;
                if (keccak256(bytes(proposal.description)) == keccak256(bytes("New DAO Membership Proposal"))) {
                    addMember(proposal.proposer);
                } else {
                    acceptedDAO = proposal.proposer;
                }
                emit ProposalPassed(proposalId);
            }
        }
        proposal.voted[msg.sender] = true;
    }

    function getProposalStatus(uint256 proposalId) external view returns (string memory description, uint256 totalVotes, uint256 requiredVotes, bool active) {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.description, proposal.totalVotes, proposal.requiredVotes, proposal.active);
    }

    function addMember(address member) public onlyOwner {
        require(!savingsContract.isDAO(member), "Already a DAO member");
        savingsContract.acceptIntoDAO(member);
        daoAddresses.push(member);
        totalMembers++;
        updateTotalVotingPower();
        emit MemberAdded(member);
    }

    // The below function will be unused for now until user is successfully removed from array
    function removeMember(address member) public onlyOwner {
        require(savingsContract.isDAO(member), "Not a DAO member");
        daoAddresses.pop();
        totalMembers--;
        updateTotalVotingPower();
        emit MemberRemoved(member);
    }

    function getCurrentProposer() external view returns (address) {
        return acceptedDAO;
    }

    function getNumberOfMembers() external view returns (uint256) {
        return totalMembers;
    }

    function getDAOAddresses() external view returns (address[] memory) {
        return daoAddresses;
    }

    function updateTotalVotingPower() private {
        uint256 newTotalVotingPower = 0;
        address[] memory members = savingsContract.fetchAddressesBySlots();
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            (uint256 balance, ) = savingsContract.getUserBalance(member);
            uint256 votingPower = balance / 3000;
            newTotalVotingPower += votingPower;
        }
        totalVotingPower = newTotalVotingPower;
    }
}