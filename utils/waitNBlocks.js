const { ethers } = require('hardhat')

const waitNBlocks = async (n) => {
    const lastBlockNumber = await ethers.provider.getBlockNumber()
    console.log('block number: ' + lastBlockNumber)
    await new Promise((resolve, reject) => {
        ethers.provider.on('block', (currentBlockNumber) => {
            if (currentBlockNumber == lastBlockNumber + n) {
                resolve()
            }
        })
    })
}

module.exports = { waitNBlocks }
