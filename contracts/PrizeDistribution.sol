// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {VRFV2WrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/VRFV2WrapperConsumerBase.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "./interfaces/ISavingsContract.sol";
import "./interfaces/IDAOGovernance.sol";

contract PrizeDistribution is VRFV2WrapperConsumerBase, ConfirmedOwner {
    ISavingsContract public savingsContract;
    IDAOGovernance public daoGovernance;

    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(
        uint256 requestId,
        uint256[] randomWords,
        uint256 payment
    );

    struct RequestStatus {
        uint256 paid; // amount paid in link
        bool fulfilled; // whether the request has been successfully fulfilled
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus)
        public s_requests; /* requestId --> requestStatus */

    // past requests Id.
    uint256[] public requestIds;
    uint256 public lastRequestId;
    uint256 lastRequestTime;

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 callbackGasLimit = 300000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 3;

    // For this example, retrieve 2 random values in one request.
    // Cannot exceed VRFV2Wrapper.getConfig().maxNumWords.
    uint32 numWords;

    // Address LINK - hardcoded for Sepolia
    address linkAddress = 0x779877A7B0D9E8603169DdbD7836e478b4624789;

    // address WRAPPER - hardcoded for Sepolia
    address wrapperAddress = 0xab18414CD93297B0d12ac29E63Ca20f515b3DB46;

    address[] public winners;
    address savingsContractAddress;
    uint256 contractSharePercentage = 20;
    uint256 daoShare = 30;
    uint256 winnerSharePercentage = 30;
    uint256 currentUsersPercentage = 10;
    uint256 proposerSharePercentage = 10;

    event WinnersSelected(address[] winners);
    event ProfitDistributed(address indexed proposer, uint256 proposerShare, uint256 contractShare, uint256 daoShare, address[] winners, uint256 winnerShare);

    constructor(
        address _savingsContractAddress,
        address _daoGovernanceAddress
    ) VRFV2WrapperConsumerBase(linkAddress, wrapperAddress)
    ConfirmedOwner(msg.sender) {
        savingsContract = ISavingsContract(_savingsContractAddress);
        savingsContractAddress = savingsContractAddress;
        daoGovernance = IDAOGovernance(_daoGovernanceAddress);
    }

    function requestRandomWords()
        external
        onlyOwner
        returns (uint256 requestId)
    {
        numWords = getNumWords();
        requestId = requestRandomness(
            callbackGasLimit,
            requestConfirmations,
            numWords
        );
        s_requests[requestId] = RequestStatus({
            paid: VRF_V2_WRAPPER.calculateRequestPrice(callbackGasLimit),
            randomWords: new uint256[](0),
            fulfilled: false
        });
        requestIds.push(requestId);
        lastRequestId = requestId;
        lastRequestTime = block.timestamp;
        emit RequestSent(requestId, numWords);
        return requestId;
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].paid > 0, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        emit RequestFulfilled(
            _requestId,
            _randomWords,
            s_requests[_requestId].paid
        );
    }

    function getRequestStatus(
        uint256 _requestId
    )
        public
        view
        returns (uint256 paid, bool fulfilled, uint256[] memory randomWords)
    {
        require(s_requests[_requestId].paid > 0, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.paid, request.fulfilled, request.randomWords);
    }

    /**
     * Allow withdraw of Link tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(linkAddress);
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
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
        require(lastRequestId != 0, "requestRandomWords not called yet");
        require(block.timestamp > lastRequestTime + 40, "Wait a bit longer for fulfillment");
        ( , bool fulfilled, ) = getRequestStatus(lastRequestId);
        require(fulfilled, "Random number not yet available");

        uint256 userSlots = savingsContract.getTotalSlots();
        uint256 daoSlots = savingsContract.totalDAOSlots();
        uint256 totalSlots = userSlots - daoSlots;
        require(totalSlots >= numWords, "Not enough addresses for selection");

        numWords = getNumWords();
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

    function getNumWords() public view returns(uint32 _numWords) {
         address[] memory numberOfUsers = savingsContract.fetchUserAddresses();
        // Check if numberOfWinners.length is within the uint32 range
        require(numberOfUsers.length <= type(uint32).max, "Number of winners exceeds uint32 max value");
        _numWords = uint32(((numberOfUsers.length * 5) / 100) + 1);
    }
}