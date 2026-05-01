import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    amoy: {
      url:      process.env.RPC_URL ?? 'https://rpc-amoy.polygon.technology',
      accounts: process.env.ADMIN_PRIVATE_KEY ? [process.env.ADMIN_PRIVATE_KEY] : [],
      chainId:  80002,
    },
  },
  paths: {
    sources:   './contracts',
    tests:     './test',
    artifacts: './artifacts',
  },
};

export default config;
