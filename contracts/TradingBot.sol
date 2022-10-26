// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@chainlink/contracts/src/v0.8/AutomationCompatible.sol';
import '@chainlink/contracts/src/v0.8/ChainlinkClient.sol';

contract TradingBot is AutomationCompatibleInterface, ChainlinkClient {
    using Chainlink for Chainlink.Request;

    // -- VARIABLES --
    uint private s_counter; // just temporary
    uint private immutable i_interval; // after how many seconds pull the data from Truflation
    uint private s_lastTimeStamp;
    uint256 private immutable i_truflationOracleFee;
    bytes32 private immutable i_truflationOracleJobId;

    // -- EVENTS --
    event RequestInflation(bytes32 indexed requestId, uint256 inflation);

    // -- ERRORS --
    error UpkeepNotNeeded(uint timePassed);

    // -- CONSTRUCTOR --
    constructor(
        uint interval,
        uint256 truflationOracleFee,
        bytes32 truflationOracleJobId
    ) {
        // Initialize chainlink automation
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;

        // Initialize truflation oracle
        i_truflationOracleFee = truflationOracleFee;
        i_truflationOracleJobId = truflationOracleJobId;

        s_counter = 0;
    }

    // -- METHODS --
    function checkConditions() private view returns (bool) {
        bool isIntervalElapsed = (block.timestamp - s_lastTimeStamp) > i_interval;

        // If interval seconds are elapsed we pull truflation data and check the market conditions, else return false
        if (isIntervalElapsed) {
            // Retrieve truflation data
            uint256 yoyInflation = requestInflationData();
            uint256 consumerSentiment = requestConsumerSentimentData();

            // - Delta >= 1 --> make a trade
            // - Delta < 1 ---> don't trade
            return (yoyInflation * consumerSentiment >= 1);
        } else {
            return (false);
        }
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        upkeepNeeded = checkConditions();

        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        // Check if this function is called by the checkUpKeep function or a possible attacker by re-checking the Conditions
        if (!checkConditions()) {
            revert UpkeepNotNeeded(block.timestamp - s_lastTimeStamp);
        }

        s_lastTimeStamp = block.timestamp;

        s_counter = s_counter + 1;

        // TODO: BUY / SELL
    }

    // Create a Chainlink request to retrieve API response, find the target data
    function requestInflationData() public view returns (uint256 yoyInflation) {
        // Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        // return sendChainlinkRequest(req, fee);
        uint256 foo = 1;
        return foo;
    }

    // Create a Chainlink request to retrieve API response, find the target data
    function requestConsumerSentimentData() public view returns (uint256 consumerSentiment) {
        // Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        // return sendChainlinkRequest(req, fee);
        uint256 foo = 1;
        return foo;
    }

    // -- GETTERS --
    function getCounter() public view returns (uint) {
        return s_counter;
    }

    function getInterval() public view returns (uint) {
        return i_interval;
    }

    function getTruflationOracleFee() public view returns (uint256) {
        return i_truflationOracleFee;
    }

    function getTruflationOracleJobId() public view returns (bytes32) {
        return i_truflationOracleJobId;
    }

    function getLastTimeStamp() public view returns (uint) {
        return s_lastTimeStamp;
    }
}
