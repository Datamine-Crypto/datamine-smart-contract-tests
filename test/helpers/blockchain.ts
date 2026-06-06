import { getEthers } from './getEthers';

/**
 * Advances the blockchain by a specified number of blocks and returns the new block number.
 * This is crucial for testing time-dependent logic in smart contracts, such as
 * block-based rewards, failsafe periods, or time-locked functionalities.
 * @param blockCount The number of blocks to mine.
 * @returns The block number after mining.
 */
export async function mineBlocks(blockCount: number): Promise<number> {
	const ethers = await getEthers();

	if (blockCount === 1) {
		await ethers.provider.send('evm_mine', []);
	} else {
		await ethers.provider.send('hardhat_mine', ['0x' + blockCount.toString(16)]);
	}
	return await ethers.provider.getBlockNumber();
}

/**
 * Executes a callback with automine disabled, then re-enables it.
 * This helper encapsulates the setup and teardown logic for executing
 * same-block transactions, which is crucial for testing front-running,
 * gas wars, and other same-block transaction ordering edge cases.
 * @param action The asynchronous callback function to execute while automining is disabled.
 */
export async function runInSameBlock(action: () => Promise<void>): Promise<void> {
	const ethers = await getEthers();
	await ethers.provider.send('evm_setAutomine', [false]);
	try {
		await action();
	} finally {
		await ethers.provider.send('evm_setAutomine', [true]);
	}
}
