import { ethers as ethersLib } from 'ethers';
import { getEthers } from './getEthers';

/**
 * A generic helper to authorize and lock tokens in one step.
 * This simplifies test scenarios where a user needs to lock tokens,
 * ensuring the necessary authorization is handled automatically.
 * @param token The token contract to lock into (e.g., FluxToken, LockquidityToken).
 * @param damToken The DAM token contract instance.
 * @param user The user/signer account performing the lock.
 * @param amount The amount of DAM to lock.
 * @param minterAddress Optional address to be designated as the minter. Defaults to the user's address.
 * @returns The block number after the lock transaction.
 */
export async function lockTokens(token: any, damToken: any, user: any, amount: any, minterAddress?: any) {
	const ethers = await getEthers();

	const minter = minterAddress || user.address;
	// Authorize the target token contract to spend DAM tokens on behalf of the user.
	// This is required for the `lock` function to pull DAM tokens from the user.
	await damToken.connect(user).authorizeOperator(token.target);
	// Execute the lock operation.
	await token.connect(user).lock(minter, amount);
	// Return the current block number to allow for time-dependent assertions in tests.
	return await ethers.provider.getBlockNumber();
}

/**
 * Parses a string amount into a BigInt, considering the specified number of decimals.
 * This helper ensures consistent and accurate handling of token amounts, especially
 * when dealing with varying decimal places in different tokens, preventing precision errors in tests.
 * @param amount The string representation of the amount.
 * @param decimals The number of decimals to use for parsing (default is 18).
 * @returns The parsed amount as a BigInt.
 */
export function parseUnits(amount: string, decimals: number = 18) {
	return ethersLib.parseUnits(amount, decimals);
}

/**
 * Gets an instance of the ERC1820 registry contract.
 * This is necessary for interacting with ERC777 tokens, as the ERC1820 registry
 * is used to discover and register interfaces for ERC777 hooks (e.g., `tokensToSend`, `tokensReceived`).
 * @returns A contract instance attached to the ERC1820 registry address.
 */
export async function getERC1820Registry() {
	const ethers = await getEthers();
	const abi = [
		'function getInterfaceImplementer(address account, bytes32 _interfaceHash) external view returns (address)',
		'function setInterfaceImplementer(address account, bytes32 _interfaceHash, address implementer) external',
	];
	return await ethers.getContractAt(abi, '0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24');
}

/**
 * A generic helper that transfers DAM tokens from owner to user, then locks them in the token contract.
 * @param token The token contract to lock into (e.g., FluxToken, LockquidityToken).
 * @param damToken The DAM token contract instance.
 * @param owner The owner/signer account performing the transfer.
 * @param user The user/signer account performing the lock.
 * @param amount The amount of DAM to transfer and lock.
 * @param minterAddress Optional address to be designated as the minter.
 * @returns The block number after the lock transaction.
 */
export async function transferAndLockTokens(
	token: any,
	damToken: any,
	owner: any,
	user: any,
	amount: any,
	minterAddress?: any
) {
	await damToken.connect(owner).transfer(user.address, amount);
	return await lockTokens(token, damToken, user, amount, minterAddress);
}
