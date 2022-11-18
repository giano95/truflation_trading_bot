const { developmentChains, botConfig, networkConfig } = require('../../helper-hardhat-config')
const { network, deployments, ethers, getNamedAccounts } = require('hardhat')
const { assert, expect } = require('chai')
const chai = require('chai')
const { solidity } = require('ethereum-waffle')
chai.use(solidity) // This tells Chai to use the Solidity plug-in

// We do unit test only on dev/local chains, so for real ones we skip
!developmentChains.includes(network.name)
    ? describe.skip
    : describe('TradingBot Unit Tests', function () {
          let deployer
          let user
          let tradingBotContract
          let tradingBot
          let checkInterval
          let truflationOracleFee
          let truflationOracleJobId

          beforeEach(async () => {
              // Get accounts
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]

              // deploy all the contracts
              await deployments.fixture(['all'])

              // Get the TradingBot contract and connect it to
              tradingBotContract = await ethers.getContract('TradingBotV2')
              tradingBot = tradingBotContract.connect(deployer)
          })

          // Test the contructor function
          describe('constructor', () => {
              it('initialize tradingBot correctly', async () => {
                  // Assert that the variables are initialized correctly
                  console.log(await tradingBot.getFsyms())
              })
          })
      })
