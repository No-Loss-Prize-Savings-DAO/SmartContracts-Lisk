// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "./interfaces/ISavingsContract.sol";
import "./interfaces/IDAOGovernance.sol";

contract PrizeDistribution is VRFConsumerBaseV2, ConfirmedOwner {
    ISavingsContract public savingsContract;
    IDAOGovernance public daoGovernance;

    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }

    mapping(uint256 => RequestStatus) s_requests; /* requestId --> requestStatus */
    VRFCoordinatorV2Interface COORDINATOR;

    // Your subscription ID.
    uint64 s_subscriptionId;

    // past requests Id.
    uint256[] requestIds;
    uint256 public lastRequestId;

    uint256 lastRequestTime;

    bytes32 keyHash =
        0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;

    uint32 callbackGasLimit = 300000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 7;

    // For this example, retrieve 5 random values in one request.
    // Cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS.
    uint32 numWords = 5;

    address[] public winners;
    uint256 contractSharePercentage = 30;
    uint256 daoShare = 30;
    uint256 winnerSharePercentage = 30;
    uint256 proposerSharePercentage = 10;

    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);
    event RandomWordsRequested(uint256 requestId);
    event WinnersSelected(address[] winners);
    event ProfitDistributed(address indexed proposer, uint256 proposerShare, uint256 contractShare, uint256 daoShare, address[] winners, uint256 winnerShare);

    constructor(
        uint64 subscriptionId,
        address _savingsContractAddress,
        address _daoGovernanceAddress
    ) VRFConsumerBaseV2(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625)
        ConfirmedOwner(msg.sender) {
        COORDINATOR = VRFCoordinatorV2Interface(
            0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
        );
        s_subscriptionId = subscriptionId;
        savingsContract = ISavingsContract(_savingsContractAddress);
        daoGovernance = IDAOGovernance(_daoGovernanceAddress);
    }

    function requestRandomWords()
        public
        onlyOwner
        returns (uint256 requestId)
    {
        // Will revert if subscription is not set and funded.
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        requestIds.push(requestId);
        lastRequestId = requestId;
        lastRequestTime = block.timestamp;
        emit RequestSent(requestId, numWords);

        emit RandomWordsRequested(requestId);
        return requestId;
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        for (uint256 i = 0; i < _randomWords.length; i++) {
        // Generate a random number between 1 and 3
            _randomWords[i] = _randomWords[i] % 10;
        }
        s_requests[_requestId].randomWords = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);
    }

    function getRequestStatus(uint256 _requestId) public view returns (bool fulfilled, uint256 randomNumber1, uint256 randomNumber2, uint256 randomNumber3, uint256 randomNumber4, uint256 randomNumber5) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords[0], request.randomWords[1], request.randomWords[2], request.randomWords[3], request.randomWords[4]);
    }

    function distributeProfit(uint256 amount) external {
        require(amount > 0, "Invalid profit amount");

        address[] memory fetchedWinners = getWinners();
        require(fetchedWinners.length == 5, "Invalid number of winners");

        address proposer = daoGovernance.getCurrentProposer();
        require(proposer != address(0), "No proposer found");

        // Ensure proposer is not one of the winners
        for (uint256 i = 0; i < fetchedWinners.length; i++) {
            require(proposer != winners[i], "Proposer cannot be a winner");
        }

        uint256 proposerShare = (amount * proposerSharePercentage) / 100;
        uint256 contractShare = (amount * contractSharePercentage) / 100;
        uint256 totalDaoShare = (amount * daoShare) / 100;
        uint256 daoSharePerMember = totalDaoShare / daoGovernance.getNumberOfMembers();
        uint256 winnerShare = (amount * winnerSharePercentage) / 100;
        uint256 individualWinnerShare = winnerShare / winners.length;

        // Transfer shares to proposer, contract, and DAO members
        savingsContract.transferFund(proposer, proposerShare);
        savingsContract.transferFund(address(this), contractShare);
        address[] memory daos = daoGovernance.getDAOAddresses();
        for (uint256 i = 0; i < daos.length; i++) {
            savingsContract.transferFund(daos[i], daoSharePerMember);
        }

        // Transfer shares to winners
        for (uint256 i = 0; i < winners.length; i++) {
            savingsContract.transferFund(winners[i], individualWinnerShare);
        }

        // Clear winners array in Prize Distribution contract
        clearWinners();

        emit ProfitDistributed(proposer, proposerShare, contractShare, daoSharePerMember, winners, winnerShare);
    }

    function getWinners() public returns (address[] memory) {
        uint256 totalSlots = savingsContract.getTotalSlots();
        require(totalSlots >= numWords, "Not enough addresses for selection");

        address[] memory selectedWinners = new address[](numWords);
        uint256[] memory latestRandomWords = s_requests[lastRequestId].randomWords;
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
}