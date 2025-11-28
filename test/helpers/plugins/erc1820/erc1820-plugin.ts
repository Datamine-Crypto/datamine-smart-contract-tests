import { EthereumProvider } from 'hardhat/types/providers';
import { ERC1820_ADDRESS, ERC1820_DEPLOYER, ERC1820_PAYLOAD } from './erc1820-data';

async function ensureERC1820(provider: EthereumProvider): Promise<void> {
	const code = await provider.send('eth_getCode', [ERC1820_ADDRESS, 'latest']);
	if (code === '0x') {
		// Fund the deployer account directly using Hardhat's setBalance
		await provider.send('hardhat_setBalance', [ERC1820_DEPLOYER.toLowerCase(), '0x11c37937e080000']);

		await provider.send('eth_sendRawTransaction', [ERC1820_PAYLOAD]);

		console.log('ERC1820 registry successfully deployed');
	}
}

export const erc1820Plugin = {
	id: 'erc1820-plugin',
	hookHandlers: {
		network: async () => {
			return {
				default: async () => {
					return {
						async newConnection(context: any, next: any) {
							const connection = await next(context);

							try {
								await ensureERC1820(connection.provider);
							} catch (error) {
								console.error('ERC1820 Plugin: Failed to ensure ERC1820', error);
							}

							return connection;
						},
					};
				},
			};
		},
	},
};
