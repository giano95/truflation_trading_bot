const { developmentChains, botConfig, networkConfig } = require('../../helper-hardhat-config')
const { network, deployments, ethers, getNamedAccounts } = require('hardhat')
const { assert, expect, use } = require('chai')
const chai = require('chai')
const { solidity } = require('ethereum-waffle')
chai.use(solidity) // This tells Chai to use the Solidity plug-in

// We do unit test only on dev/local chains, so for real ones we skip
!developmentChains.includes(network.name)
    ? describe.skip
    : describe('SwapContract Unit Tests', function () {
          let deployer
          let user
          let swapContract
          let tradingBotContract
          let tradingBot

          beforeEach(async () => {
              // Get accounts
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]

              // deploy all the contracts
              await deployments.fixture(['all'])

              // Get the SwapContract and connect it to
              swapContract = await ethers.getContract('SwapContract')
              swapContract = swapContract.connect(deployer)

              // Get the TradingBot contract and connect it to
              tradingBotContract = await ethers.getContract('TradingBot')
              tradingBot = tradingBotContract.connect(deployer)

              const erc20Abi = [
                  'function name() public view returns (string)',
                  'function symbol() public view returns (string)',
                  'function decimals() public view returns (uint8)',
                  'function totalSupply() public view returns (uint256)',
                  'function balanceOf(address _owner) public view returns (uint256 balance)',
                  'function transfer(address _to, uint256 _value) public returns (bool success)',
                  'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
                  'function approve(address _spender, uint256 _value) public returns (bool success)',
                  'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',
              ]

              // The Hardhat local node provides us an account that is preloaded with a bunch of test ETH. Since we’re swapping WETH for DAI,
              // we have to take some of that ETH and wrap it.
              const WETH = new ethers.Contract('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', erc20Abi, user)
              const tx = {
                  to: WETH.address,
                  value: ethers.utils.parseEther('10.1'),
                  gasLimit: 50000,
                  nonce: undefined,
              }
              const depositTx = await user.sendTransaction(tx)
              await depositTx.wait()
              console.log('User WETH initial balance: ' + (await WETH.balanceOf(user.address)).toString()) // this must be 10 ethers

              // Check Initial DAI Balance
              const DAI = new ethers.Contract('0x6B175474E89094C44Da98b954EedeAC495271d0F', erc20Abi, user)
              const expandedDAIBalanceBefore = await DAI.balanceOf(user.address)
              const DAIBalanceBefore = Number(ethers.utils.formatUnits(expandedDAIBalanceBefore, 18))
              console.log('User DAI initial balance: ' + DAIBalanceBefore) // this must be 0 ethers

              // Approve the swapper contract to spend WETH for me
              const approveTx = await WETH.approve(swapContract.address, ethers.utils.parseEther('10.0'))
              await approveTx.wait()

              //   const allowance = await WETH.allowance(user.address, swapContract.address)
              //   console.log(allowance.toString()) // this must be 1 ethers

              // Execute the swap
              const swapTx = await swapContract
                  .connect(user)
                  .swapWETHForDAI(ethers.utils.parseEther('10.0'), { gasLimit: 300000 })
              await swapTx.wait()

              // Check DAI end balance
              const expandedDAIBalanceAfter = await DAI.balanceOf(user.address)
              const DAIBalanceAfter = Number(ethers.utils.formatUnits(expandedDAIBalanceAfter, 18))
              console.log('User DAI balance: ' + DAIBalanceAfter)

              // Approve the TradingBot to spend DAI for me
              const DAIApproveTx = await DAI.approve(tradingBot.address, ethers.utils.parseEther('10000.0'))
              await DAIApproveTx.wait()

              // Stake DAI inside the TradingBot
              const stakeDAITx = await tradingBot.connect(user).stakeDAI(ethers.utils.parseEther('10000.0'))
              await stakeDAITx.wait()

              const stakedDAIBalance = await tradingBot.getBalanceOf(user.address)
              console.log('User stakedDai balance: ' + Number(ethers.utils.formatUnits(stakedDAIBalance, 18)))

              // Execute the swap
              const DAISwapTx = await tradingBot
                  .connect(user)
                  .swapDAIForWETH(ethers.utils.parseEther('1000.0'), { gasLimit: 300000 })
              await DAISwapTx.wait()

              // Check the TradingBot DAI balances
              //   const stakedDAIBalanceAfter = await tradingBot.getBalanceOf(user.address)
              //   console.log(
              //       'User stakedDai balance after: ' + Number(ethers.utils.formatUnits(stakedDAIBalanceAfter, 18))
              //   )
              const stakedDAIAfter = await DAI.balanceOf(tradingBot.address)
              console.log('TradingBot DAI balance: ' + Number(ethers.utils.formatUnits(stakedDAIAfter, 18)))

              // Execute the swap
              const DAISwapTx2 = await tradingBot
                  .connect(user)
                  .swapDAIForWETH(ethers.utils.parseEther('1000.0'), { gasLimit: 300000 })
              await DAISwapTx2.wait()

              const stakedDAIAfter2 = await DAI.balanceOf(tradingBot.address)
              console.log('TradingBot DAI balance: ' + Number(ethers.utils.formatUnits(stakedDAIAfter2, 18)))
          })

          // Test the contructor function
          describe('constructor', () => {
              it('initialize tradingBot correctly', async () => {})
          })
      })
