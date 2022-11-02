const { botConfig, networkConfig, developmentChains } = require('../helper-hardhat-config')
const { verify } = require('../utils/verify')
const { waitNBlocks } = require('../utils/waitNBlocks')

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
    const args = [_link, _registrar, _registry, _swapRouter, _stakedToken, _tradedToken]

    // Actually deploy the contract
    const contract = await deploy('TradingBotV2', {
        from: deployer,
        args: args,
        log: true,
        autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && config.etherscan.apiKey[network.name]) {
        await waitNBlocks(3)
        console.log('Verifying...')
        await verify(contract.address, args)
    }
}

module.exports.tags = ['all', 'trading-bot-v2']
