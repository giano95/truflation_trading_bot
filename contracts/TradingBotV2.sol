// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// -- IMPORTS --
import {AutomationRegistryInterface, State, Config} from '@chainlink/contracts/src/v0.8/interfaces/AutomationRegistryInterface1_2.sol';
import {LinkTokenInterface} from '@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol';
import '@openzeppelin/contracts/utils/Counters.sol'; // Just a simple contracts that keep counts of how many times it's called
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@chainlink/contracts/src/v0.8/ChainlinkClient.sol';

// -- INTERFACES --
interface KeeperRegistrarInterface {
    function register(
        string memory name,
        bytes calldata encryptedEmail,
        address upkeepContract,
        uint32 gasLimit,
        address adminAddress,
        bytes calldata checkData,
        uint96 amount,
        uint8 source,
        address sender
    ) external;
}

struct DcaBot {
    address owner;
    uint256 orderInterval; // interval in seconds in which the bot swap 'amount' DAI for WETH
    uint256 orderSize;
    uint256 lastTimeStamp;
    uint256 counter; // count how many times we trade
    uint256 maxNumberOfOrders;
}

// -- CONTRACTS --
contract TradingBotV2 is ReentrancyGuard {
    using Counters for Counters.Counter;
    using Chainlink for Chainlink.Request;

    // -- CONSTANTS --
    // address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F; // MAINNET
    // address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // MAINNET
    // address public constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984; // MAINNET
    // address public constant WETH9 = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6; // GOERLI
    // address public constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984; // GOERLI

    uint24 public constant feeTier = 3000;

    // -- VARIABLES --
    Counters.Counter private _counterIDCounter; // Counter ID

    mapping(uint256 => DcaBot) public counterToDcaBot;
    mapping(uint256 => uint256) public counterToUpkeepID;

    LinkTokenInterface public immutable i_link;
    address public immutable registrar;
    AutomationRegistryInterface public immutable i_registry;
    bytes4 registerSig = KeeperRegistrarInterface.register.selector;

    ISwapRouter public immutable i_swapRouter;
    address public immutable i_stakedToken;
    address public immutable i_tradedToken;
    mapping(address => uint256) public stakingBalance;
    mapping(address => uint256) public tradingBalance;

    // -- ERRORS --
    error UpkeepNotNeeded(uint256 currentTimeStamp, uint256 lastTimeStamp);
    error AutoApproveDisabled();

    // -- CONSTRUCTOR --
    constructor(
        LinkTokenInterface _link,
        address _registrar,
        AutomationRegistryInterface _registry,
        ISwapRouter _swapRouter,
        address _stakedToken,
        address _tradedToken
    ) {
        // GOERLI: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
        i_link = _link;
        // GOERLI: 0x9806cf6fBc89aBF286e8140C42174B94836e36F2
        registrar = _registrar;
        // GOERLI: 0x02777053d6764996e594c3E88AF1D58D5363a2e6
        i_registry = _registry;

        // Initialize Uniswap Router
        i_swapRouter = _swapRouter;

        // Set Tokens addresses
        i_stakedToken = _stakedToken;
        i_tradedToken = _tradedToken;
    }

    // -- METHODS --
    function createNewInstance(
        address owner,
        uint256 orderInterval,
        uint256 orderSize,
        uint256 maxNumberOfOrders
    ) public returns (uint256) {
        uint256 counterID = _counterIDCounter.current();

        _counterIDCounter.increment();

        // initialize an empty struct and then update it
        DcaBot memory dcaBot;
        dcaBot.owner = owner;
        dcaBot.orderInterval = orderInterval;
        dcaBot.orderSize = orderSize;
        dcaBot.lastTimeStamp = block.timestamp;
        dcaBot.counter = 0;
        dcaBot.maxNumberOfOrders = maxNumberOfOrders;
        counterToDcaBot[counterID] = dcaBot;

        return counterID;
    }

    function registerAndPredictID(
        string memory name,
        uint32 gasLimit,
        uint96 fundingAmount,
        uint256 orderInterval,
        uint256 orderSize
    ) public {
        require(stakingBalance[msg.sender] > 0, 'Your staking balance is empty! Deposit some DAI first');
        require(
            stakingBalance[msg.sender] >= orderSize,
            'Your orderSize is greater than your staking balance! Deposit more DAI'
        );

        uint256 maxNumberOfOrders = stakingBalance[msg.sender] / orderSize; // integer rounded down

        (State memory state, Config memory _c, address[] memory _k) = i_registry.getState();
        uint256 oldNonce = state.nonce;

        // Create a new counter and pass in as the checkData
        uint256 counterID = createNewInstance(msg.sender, orderInterval, orderSize, maxNumberOfOrders);
        bytes memory checkData = abi.encodePacked(counterID);
        bytes memory payload = abi.encode(
            name,
            '0x', // bytes calldata encryptedEmail
            address(this), // address upkeepContract
            gasLimit,
            address(msg.sender), // address adminAddress
            checkData,
            fundingAmount, // (N.B.) minimum 5.0 LINK
            0, // uint8 source
            address(this)
        );

        // Transfer Link and call the registrar
        i_link.transferAndCall(registrar, fundingAmount, bytes.concat(registerSig, payload));
        (state, _c, _k) = i_registry.getState();
        uint256 newNonce = state.nonce;

        if (newNonce == oldNonce + 1) {
            uint256 upkeepID = uint256(
                keccak256(abi.encodePacked(blockhash(block.number - 1), address(i_registry), uint32(oldNonce)))
            );
            // Set the upkeepID
            counterToUpkeepID[counterID] = upkeepID;
        } else {
            revert AutoApproveDisabled();
        }
    }

    function checkConditions(uint256 counterID) internal view returns (bool upkeepNeeded) {
        bool isIntervalElapsed = (block.timestamp - counterToDcaBot[counterID].lastTimeStamp) >
            counterToDcaBot[counterID].orderInterval;

        upkeepNeeded = isIntervalElapsed;
    }

    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData) {
        // decode the checkData
        uint256 counterID = abi.decode(checkData, (uint256));

        upkeepNeeded = checkConditions(counterID);

        performData = checkData;
    }

    function performUpkeep(bytes calldata performData) external {
        // decode the checkData
        uint256 counterID = abi.decode(performData, (uint256));

        // Check if this function is called by the checkUpKeep function or a possible attacker by re-checking the Conditions
        if (!checkConditions(counterID)) {
            revert UpkeepNotNeeded(block.timestamp, counterToDcaBot[counterID].lastTimeStamp);
        }

        // Re-Set the last time stamp and increment the counter
        counterToDcaBot[counterID].lastTimeStamp = block.timestamp;
        counterToDcaBot[counterID].counter = counterToDcaBot[counterID].counter + 1;

        // TODO: BUY / SELL
        swapTokensForTokens(
            counterToDcaBot[counterID].owner,
            i_stakedToken,
            i_tradedToken,
            counterToDcaBot[counterID].orderSize
        );
    }

    function requestInflationData() public pure returns (uint256 yoyInflation) {
        // // Create a Chainlink request to retrieve API response, find the target data
        // Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        // return sendChainlinkRequest(req, fee);
        uint256 foo = 1;
        return foo;
    }

    function requestConsumerSentimentData() public pure returns (uint256 consumerSentiment) {
        // // Create a Chainlink request to retrieve API response, find the target data
        // Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        // return sendChainlinkRequest(req, fee);
        uint256 foo = 1;
        return foo;
    }

    function stake(uint256 stakingAmount) public {
        // stakingAmount must be > 0
        require(stakingAmount > 0, 'amount should be > 0');

        // Transfer the specified amount of DAI to this contract
        TransferHelper.safeTransferFrom(i_stakedToken, msg.sender, address(this), stakingAmount);

        // Update staking balance
        stakingBalance[msg.sender] = stakingBalance[msg.sender] + stakingAmount;
    }

    function unstake() public nonReentrant {
        uint256 balance = stakingBalance[msg.sender];

        // Balance should be > 0
        require(balance > 0, 'Your balance is 0, you have nothing to withdraw');

        // Reset staking balance
        stakingBalance[msg.sender] = 0;

        // Transfer Dai tokens to the sender
        TransferHelper.safeTransfer(i_stakedToken, msg.sender, balance);
    }

    function swapTokensForTokens(
        address sender,
        address tokenIn,
        address tokenOut,
        uint amountIn
    ) internal returns (uint256 amountOut) {
        // Staked DAI must be greater or equal the amountIn
        require(stakingBalance[sender] >= amountIn, 'The sender does not have staked enough DAI');

        // Approve the router to spend DAI
        TransferHelper.safeApprove(tokenIn, address(i_swapRouter), amountIn);

        // Create the params that will be used to execute the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: feeTier,
            recipient: sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap
        amountOut = i_swapRouter.exactInputSingle(params);

        // Update user balance
        stakingBalance[sender] = stakingBalance[sender] - amountIn;
        tradingBalance[sender] = tradingBalance[sender] + amountOut;

        return amountOut;
    }
}
