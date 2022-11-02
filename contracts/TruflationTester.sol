// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '@chainlink/contracts/src/v0.8/ChainlinkClient.sol';
import '@chainlink/contracts/src/v0.8/ConfirmedOwner.sol';

contract TruflationTester is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    int256 public yoyInflation;
    address public oracleId;
    string public jobId;
    uint256 public fee;

    // GOERLI:
    // - Oracle address: 0xcf72083697aB8A45905870C387dC93f380f2557b
    // - Job ID: 8b459447262a4ccf8863962e073576d9
    // - fee: 0.01 = 10000000000000000 WEI
    // - Link address: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
    constructor(
        address oracleId_,
        string memory jobId_,
        uint256 fee_,
        address token_
    ) ConfirmedOwner(msg.sender) {
        setChainlinkToken(token_); // Sets the stored address for the LINK token
        oracleId = oracleId_;
        jobId = jobId_;
        fee = fee_;
    }

    function requestYoyInflation() public returns (bytes32 requestId) {
        // Build the request
        Chainlink.Request memory req = buildChainlinkRequest(
            bytes32(bytes(jobId)),
            address(this),
            this.fulfillYoyInflation.selector
        );
        req.add('service', 'truflation/current');
        req.add('keypath', 'yearOverYearInflation');
        req.add('abi', 'json');
        req.add('multiplier', '1000000000000000000');

        // Send the request
        return sendChainlinkRequestTo(oracleId, req, fee);
    }

    function fulfillYoyInflation(bytes32 _requestId, bytes memory _inflation)
        public
        recordChainlinkFulfillment(_requestId)
    {
        yoyInflation = toInt256(_inflation);
    }

    function toInt256(bytes memory _bytes) internal pure returns (int256 value) {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }

    function changeOracle(address _oracle) public onlyOwner {
        oracleId = _oracle;
    }

    function changeJobId(string memory _jobId) public onlyOwner {
        jobId = _jobId;
    }

    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), 'Unable to transfer');
    }

    /*
  // The following are for retrieving inflation in terms of wei
  // This is useful in situations where you want to do numerical
  // processing of values within the smart contract

  // This will require a int256 rather than a uint256 as inflation
  // can be negative

  int256 public inflationWei;
  function requestInflationWei() public returns (bytes32 requestId) {
    Chainlink.Request memory req = buildChainlinkRequest(
      bytes32(bytes(jobId)),
      address(this),
      this.fulfillInflationWei.selector
    );
    req.add("service", "truflation/current");
    req.add("keypath", "yearOverYearInflation");
    req.add("abi", "int256");
    req.add("multiplier", "1000000000000000000");
    return sendChainlinkRequestTo(oracleId, req, fee);
  }

  function fulfillInflationWei(
    bytes32 _requestId,
    bytes memory _inflation
  ) public recordChainlinkFulfillment(_requestId) {
    inflationWei = toInt256(_inflation);
  }

  function toInt256(bytes memory _bytes) internal pure
  returns (int256 value) {
    assembly {
      value := mload(add(_bytes, 0x20))
    }
  }
*/
}
