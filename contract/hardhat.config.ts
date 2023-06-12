import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-contract-sizer'

import dotenv from 'dotenv'
dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.18',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mumbai: {
      url: process.env.MUMBAI_URL || '',
      accounts:
        process.env.WALLET_PRIVATE_KEY !== undefined
          ? [process.env.WALLET_PRIVATE_KEY]
          : [],
    },
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGON_MUMBAI_SCAN_API_KEY || '',
    },
  },
  contractSizer: {
    runOnCompile: true,
  },
}

export default config
