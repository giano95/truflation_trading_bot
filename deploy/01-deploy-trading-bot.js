const { botConfig, networkConfig, developmentChains } = require('../helper-hardhat-config')
const { verify } = require('../utils/verify')

module.exports = async function (hre) {
    const { deployments, getNamedAccounts, network, config } = hre
    const { deploy } = deployments

    const chainId = network.config.chainId

    const { deployer, user } = await getNamedAccounts()

    // Set the args
    const interval = botConfig.interval
    const truflationOracleFee = networkConfig[chainId]['truflationOracleFee']
    const truflationOracleJobId = networkConfig[chainId]['truflationOracleJobId']
    const swapRouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
    const args = [interval, truflationOracleFee, truflationOracleJobId, swapRouterAddress]

    // Actually deploy the contract
    const contract = await deploy('TradingBot', {
        from: deployer,
        args: args,
        log: true,
        autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && config.etherscan.apiKey[network.name]) {
        console.log('Verifying...')
        await verify(contract.address, args)
    }
}

module.exports.tags = ['all', 'automation-bot']
