const { parseEther, formatBytes32String } = require('ethers/lib/utils')

const developmentChains = ['hardhat', 'localhost']

const networkConfig = {
    31337: {
        name: 'hardhat',
        // -- AutomationBot --
        truflationOracleFee: parseEther('0.1'), // 0.1 LINK
        truflationOracleJobId: formatBytes32String('1'), // Dumb one
        // -- TruflationTester --
        link: null,
        oracleId: null,
        jobId: null,
        fee: null,
    },
    5: {
        name: 'goerli',
        // -- AutomationBot --
        truflationOracleFee: parseEther('0.1'), // 0.1 LINK
        truflationOracleJobId: formatBytes32String('1'), // Dumb one
        // -- TruflationTester --
        link: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB',
        oracleId: '0xcf72083697aB8A45905870C387dC93f380f2557b',
        jobId: '8b459447262a4ccf8863962e073576d9',
        fee: parseEther('0.01'),
    },
}

const botConfig = {
    interval: 10, // 10 seconds
}

module.exports = { developmentChains, networkConfig, botConfig }
