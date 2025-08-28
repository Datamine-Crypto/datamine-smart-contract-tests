import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-erc1820';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.6.6',
      },
      {
        version: '0.6.9',
      },
    ],
    settings: {
      remappings: ['@openzeppelin/=node_modules/@openzeppelin/'],
    },
  },
};

export default config;
