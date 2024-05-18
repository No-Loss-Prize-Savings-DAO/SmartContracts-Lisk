// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {GelatoVRFConsumerBase} from "./GelatoVRFConsumerBase.sol";
import "./interfaces/ISavingsContract.sol";
import "./interfaces/IDAOGovernance.sol";

contract DistributeProfit is GelatoVRFConsumerBase, ConfirmedOwner {
    ISavingsContract public savingsContract;
    IDAOGovernance public daoGovernance;

    address private immutable _operatorAddr; //
    bytes32 public latestRandomness;
    uint64 public lastRequestId;

    struct Request {
        uint256 requestTime;
        uint256 requestBlock;
        uint256 fulfilledTime;
        uint256 fulfilledBlock;
        uint256 randomness;
    }

    mapping(uint256 => Request) public requests;
    uint256 public nonce;

    address[] public winners;
    address savingsContractAddress;
    uint256 contractSharePercentage = 20;
    uint256 daoShare = 30;
    uint256 winnerSharePercentage = 30;
    uint256 currentUsersPercentage = 10;
    uint256 proposerSharePercentage = 10;

    event RandomnessRequested(uint64 requestId);
    event RandomnessFulfilled(uint256 indexed nonce, Request);
    event WinnersSelected(address[] winners);
    event ProfitDistributed(address indexed proposer, uint256 proposerShare, uint256 contractShare, uint256 daoShare, address[] winners, uint256 winnerShare);

    constructor(
        address _savingsContractAddress,
        address _daoGovernanceAddress,
        address dedicatedMsgSender
    ) ConfirmedOwner(msg.sender) {
        savingsContract = ISavingsContract(_savingsContractAddress);
        savingsContractAddress = savingsContractAddress;
        daoGovernance = IDAOGovernance(_daoGovernanceAddress);
        _operatorAddr = dedicatedMsgSender;
    }

    function requestRandomness(bytes memory _data) external onlyOwner returns (uint256 requestId){
        requestId = uint64(_requestRandomness(_data));
        emit RandomnessRequested(lastRequestId);
    }

    function _fulfillRandomness(uint256 _randomness, uint256 _requestId, bytes memory _data) internal override {
        // Ensure that this is the expected request being fulfilled
        require(lastRequestId == _requestId, "Request ID does not match the last request.");

        // Create the request record in storage
        Request storage request = requests[uint64(_requestId)];
        request.requestTime = block.timestamp;
        request.requestBlock = block.number;
        request.fulfilledTime = block.timestamp;
        request.fulfilledBlock = block.number;
        request.randomness = _randomness;

        // Update the latest randomness and lastRequestId state variables
        latestRandomness = bytes32(_randomness); // Keep if you need bytes32, otherwise just use _randomness
        lastRequestId = uint64(_requestId);

        // Emit an event to signal that the randomness has been fulfilled
        emit RandomnessFulfilled(uint64(_requestId), request);
    }

    // Implement the _operator() function to return the operator's address
    function _operator() internal view virtual override returns (address) {
        return _operatorAddr;
    }

    function distributeProfit(uint256 amount) external onlyOwner {
        // Clear winners array before starting distribution
        clearWinners();

        require(amount > 0, "Invalid profit amount");

        address[] memory fetchedWinners = getWinners();

        address proposer = daoGovernance.getCurrentProposer();
        require(proposer != address(0), "No proposer found");

        // Ensure proposer is not one of the winners
        for (uint256 i = 0; i < fetchedWinners.length; i++) {
            require(proposer != winners[i], "Proposer cannot be a winner");
        }

        uint256 proposerShare = (amount * proposerSharePercentage) / 100;
        uint256 contractShare = (amount * contractSharePercentage) / 100;
        uint256 totalDaoShare = (amount * daoShare) / 100;
        uint256 sharePerDAO = totalDaoShare / daoGovernance.getNumberOfMembers();
        uint256 winnerShare = (amount * winnerSharePercentage) / 100;
        uint256 individualWinnerShare = winnerShare / fetchedWinners.length;
        uint256 currentUsersShare = (amount * currentUsersPercentage) / 100;
        address[] memory numberOfUsers = savingsContract.fetchUserAddresses();
        uint256 sharePerUser = currentUsersShare / numberOfUsers.length;

        // Transfer shares to proposer, contract, and DAO members
        savingsContract.transferFund(proposer, proposerShare);
        savingsContract.transferFund(savingsContractAddress, contractShare);
        address[] memory daos = daoGovernance.getDAOAddresses();
        for (uint256 i = 0; i < daos.length; i++) {
            savingsContract.transferFund(daos[i], sharePerDAO);
        }

        // Transfer shares to current users
        for (uint256 i = 0; i < numberOfUsers.length; i++) {
            savingsContract.transferFund(numberOfUsers[i], sharePerUser);
        }

        // Transfer shares to winners
        for (uint256 i = 0; i < fetchedWinners.length; i++) {
            savingsContract.transferFund(fetchedWinners[i], individualWinnerShare);
        }

        emit ProfitDistributed(proposer, proposerShare, contractShare, sharePerDAO, winners, winnerShare);
    }

    function getWinners() public returns (address[] memory) {
        uint8 numWords = 1;
        uint256 userSlots = savingsContract.getTotalSlots();
        uint256 daoSlots = savingsContract.totalDAOSlots();
        uint256 totalSlots = userSlots - daoSlots;
        require(totalSlots >= numWords, "Not enough addresses for selection");

        address[] memory selectedWinners = new address[](numWords);
        // uint256[] memory latestRandomWords = requests[lastRequestId].randomness;
        uint256[] memory latestRandomWords = new uint256[](numWords);
        latestRandomWords[0] = requests[lastRequestId].randomness;
        require(latestRandomWords.length == numWords, "Random words not available");

        // Call fetchAddressesBySlots to get the array of addresses
        address[] memory addressesBySlots = savingsContract.fetchAddressesBySlots();

        for (uint256 i = 0; i < numWords; i++) {
            // Use the random word to select an address index within the range of total slots
            uint256 winnerIndex = latestRandomWords[i] % totalSlots;
            // Ensure winnerIndex is within the bounds of the addressesBySlots array
            require(winnerIndex < addressesBySlots.length, "Index out of bounds");
            selectedWinners[i] = addressesBySlots[winnerIndex];
        }
        winners = selectedWinners; // Store winners for distribution
        emit WinnersSelected(winners);
        return winners;
    }

    function clearWinners() private {
        delete winners;
    }

    function getNumWords() public view returns(uint32 _numWords) {
         address[] memory numberOfUsers = savingsContract.fetchUserAddresses();
        // Check if numberOfWinners.length is within the uint32 range
        require(numberOfUsers.length <= type(uint32).max, "Number of winners exceeds uint32 max value");
        _numWords = uint32(((numberOfUsers.length * 5) / 100) + 1);
    }
}