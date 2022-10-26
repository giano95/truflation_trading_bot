const { parseEther, formatBytes32String } = require('ethers/lib/utils')

const developmentChains = ['hardhat', 'localhost']

const networkConfig = {
    31337: {
        name: 'hardhat',
        truflationOracleFee: parseEther('0.1'), // 0.1 LINK
        truflationOracleJobId: formatBytes32String('1'),
    },
    5: {
        name: 'goerli',
        truflationOracleFee: parseEther('0.1'), // 0.1 LINK
        truflationOracleJobId: formatBytes32String('1'),
    },
}

const botConfig = {
    interval: 10, // 10 seconds
}

module.exports = { developmentChains, networkConfig, botConfig }
