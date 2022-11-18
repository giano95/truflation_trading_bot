const { botConfig, networkConfig, developmentChains } = require('../helper-hardhat-config')
const { verify } = require('../utils/verify')
const { waitNBlocks } = require('../utils/waitNBlocks')
const bytes32 = require('bytes32')

module.exports = async function (hre) {
    const { deployments, getNamedAccounts, network, config, ethers } = hre
    const { deploy } = deployments

    const chainId = network.config.chainId

    const { deployer, user } = await getNamedAccounts()

    // Set the args
    const _link = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB' // GOERLI
    const _registrar = '0x9806cf6fBc89aBF286e8140C42174B94836e36F2' // GOERLI
    const _registry = '0x02777053d6764996e594c3E88AF1D58D5363a2e6' // GOERLI
    const _swapRouter = '0xE592427A0AEce92De3Edee1F18E0157C05861564' // Mainnet, Polygon, Optimism, Arbitrum, Testnets Address
    const _stakedToken = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6' // WETH: GOERLI
    const _tradedToken = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' // UNI:  GOERLI
    // const _chainlinkOracle = '0xCC79157eb46F5624204f47AB42b3906cAA40eaB7' // GOERLI
    const _chainlinkOracle = '0xD189e75a64989E4d2cDBAefcDDB4BD931e299121' // MY GOERLI
    // const _getPriceJobId = bytes32({ input: 'ca98366cc7314957b8c012c72f05aeeb' }) // GOERLI
    const _getPriceJobId = bytes32({ input: '89a3bdb8bddb4308a3f33b3fd215da05' }) // MY GOERLI
    const _getPriceFee = ethers.utils.parseEther('0.1')
    const _truflationOracle = '0x0F7C4A8D7e911E6A6d0b3aAAB6a833601ccE65cC' // GOERLI
    const args = [
        _link,
        _registrar,
        _registry,
        _swapRouter,
        _stakedToken,
        _tradedToken,
        _chainlinkOracle,
        _getPriceJobId,
        _getPriceFee,
        _truflationOracle,
    ]

    // Actually deploy the contract
    const contract = await deploy('TradingBotV3', {
        from: deployer,
        args: args,
        log: true,
        autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
        // gasLimit: 40000000,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && config.etherscan.apiKey[network.name]) {
        await waitNBlocks(3)
        console.log('Verifying...')
        await verify(contract.address, args)
    }
}

module.exports.tags = ['all', 'trading-bot-v3']
