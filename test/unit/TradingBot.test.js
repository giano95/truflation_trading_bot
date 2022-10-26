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
              tradingBotContract = await ethers.getContract('TradingBot')
              tradingBot = tradingBotContract.connect(deployer)

              const chainId = network.config.chainId

              checkInterval = botConfig.interval
              truflationOracleFee = networkConfig[chainId]['truflationOracleFee']
              truflationOracleJobId = networkConfig[chainId]['truflationOracleJobId']
          })

          // Test the contructor function
          describe('constructor', () => {
              it('initialize tradingBot correctly', async () => {
                  // Assert that the variables are initialized correctly
                  assert.equal(await tradingBot.getInterval(), checkInterval)
                  assert.equal((await tradingBot.getTruflationOracleFee()).toString(), truflationOracleFee.toString())
                  assert.equal(
                      (await tradingBot.getTruflationOracleJobId()).toString(),
                      truflationOracleJobId.toString()
                  )
                  assert.equal(await tradingBot.getCounter(), 0)
              })
          })

          // Test the checkUpkeep function
          describe('checkUpkeep', () => {
              it("returns false if 'checkInterval' seconds aren't elapsed yet", async () => {
                  // callStatic simulate calling a function without actually creating a transaction
                  // so we can esaminate the output without creating a new block
                  const { upkeepNeeded } = await tradingBot.callStatic.checkUpkeep('0x')
                  assert(!upkeepNeeded)
              })

              it("returns true if 'checkInterval' seconds are elapsed", async () => {
                  // increse the time of our local chain by checkInterval + 1
                  await network.provider.send('evm_increaseTime', [checkInterval + 1])
                  await network.provider.request({ method: 'evm_mine', params: [] })

                  // callStatic simulate calling a function without actually creating a transaction
                  // so we can esaminate the output without creating a new block
                  const { upkeepNeeded } = await tradingBot.callStatic.checkUpkeep('0x')
                  assert(upkeepNeeded)
              })
          })

          // Test the performUpkeep function
          describe('performUpkeep', () => {
              it("revert with UpkeepNotNeeded if 'checkInterval' seconds aren't elapsed yet", async () => {
                  await expect(tradingBot.performUpkeep('0x')).to.be.revertedWith('UpkeepNotNeeded')
              })

              it("update 'lastTimeStamp' and 'counter' when performed", async () => {
                  // Get values
                  const lastTimeStamp = await tradingBot.getLastTimeStamp()
                  const counter = await tradingBot.getCounter()

                  // increse the time of our local chain by checkInterval + 1
                  await network.provider.send('evm_increaseTime', [checkInterval + 1])
                  await network.provider.request({ method: 'evm_mine', params: [] })

                  await tradingBot.performUpkeep('0x')

                  // Assert they're updated
                  assert.notEqual(lastTimeStamp, await tradingBot.getLastTimeStamp())
                  assert.equal(Number(counter) + 1, await tradingBot.getCounter())
              })
          })
      })
