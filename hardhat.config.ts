import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import hardhatMocha from '@nomicfoundation/hardhat-mocha';
import hardhatIgnitionEthers from '@nomicfoundation/hardhat-ignition-ethers';
import hardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';
import hardhatChaiMatchers from '@nomicfoundation/hardhat-ethers-chai-matchers';

import { defineConfig } from 'hardhat/config';
import { erc1820Plugin } from './test/helpers/plugins/erc1820/erc1820-plugin.js';

export default defineConfig({
	plugins: [
		erc1820Plugin,
		hardhatEthers,
		hardhatMocha,
		hardhatIgnitionEthers,
		hardhatNetworkHelpers,
		hardhatChaiMatchers,
	],
	solidity: {
		compilers: [
			{
				version: '0.6.6',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
			{
				version: '0.6.9',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
			{
				version: '0.8.30',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
					viaIR: true,
				},
			},
		],
	},
});
