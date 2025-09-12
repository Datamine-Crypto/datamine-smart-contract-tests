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
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
    settings: {
      remappings: ['@openzeppelin/=node_modules/@openzeppelin/'],
    },
  },
};

export default config;
