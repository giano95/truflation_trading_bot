require('hardhat-deploy')
require('@nomiclabs/hardhat-ethers')
require('solidity-coverage')
require('@nomiclabs/hardhat-etherscan')
require('dotenv').config()

module.exports = {
    solidity: {
        version: '0.8.17',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        goerli: {
            chainId: 5,
            url: process.env.GOERLI_RPC_URL || '',
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
            blockConfirmations: 3,
            saveDeployments: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        user: {
            default: 1,
        },
    },
    // etherscan-verify
    etherscan: {
        apiKey: {
            goerli: process.env.ETHERSCAN_API_KEY || null,
        },
    },
}
