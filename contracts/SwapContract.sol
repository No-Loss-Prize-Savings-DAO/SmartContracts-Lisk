// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED
 * VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */

/**
 * If you are reading data feeds on L2 networks, you must
 * check the latest answer from the L2 Sequencer Uptime
 * Feed to ensure that the data is accurate in the event
 * of an L2 sequencer outage. See the
 * https://docs.chain.link/data-feeds/l2-sequencer-feeds
 * page for details.
 */

contract SwapContract {
    AggregatorV3Interface internal dataFeed;

    /**
     * Network: Sepolia
     * Aggregator: CZK/USD
     * Address: 0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA
     */
    constructor() {
        dataFeed = AggregatorV3Interface(
            0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA
        );
    }

    /**
     * Returns the latest answer.
     */
    function getChainlinkDataFeedLatestAnswer() public view returns (int) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    // Function to convert USD to BLZ
    function convertUSDtoBLZ(uint256 usdAmount) public view returns (uint256) {
        int priceInUSD = getChainlinkDataFeedLatestAnswer();
        // Adjust for the difference in decimals
        uint256 priceInUSDWithDecimals = uint256(priceInUSD) * 10**6 / 10**8;
        uint256 blzAmount = usdAmount * 10**18 / priceInUSDWithDecimals;
        return blzAmount;
    }

    // Function to convert BLZ to USD
    function convertBLZtoUSD(uint256 blzAmount) public view returns (uint256) {
        int priceInUSD = getChainlinkDataFeedLatestAnswer();
        // Adjust for the difference in decimals
        uint256 priceInUSDWithDecimals = uint256(priceInUSD) * 10**6 / 10**8; // 10**8 is from chainlink decimals padding
        uint256 usdAmount = blzAmount * priceInUSDWithDecimals / 10**18;
        return usdAmount;
    }
}