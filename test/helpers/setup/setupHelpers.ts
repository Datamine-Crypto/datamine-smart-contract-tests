import { expect } from 'chai';
import { mineBlocks } from '../core/blockchain';

/**
 * @dev This file centralizes helper functions for setting up specific test scenarios.
 * The purpose of these helpers is to create consistent and complex initial states
 * for tests, reducing boilerplate and improving the readability and maintainability
 * of the test suite.
 */

/**
 * Sets up the DamBlockingHolder contract for a re-entrancy test.
 * This helper is crucial for preparing the contract with specific test parameters,
 * initial token balances, and operator authorizations, enabling controlled
 * simulation of re-entrancy attack vectors.
 * @param damBlockingHolder The DamBlockingHolder contract instance.
 * @param owner The owner/signer account.
 * @param damToken The DAM token contract instance.
 * @param lockquidityToken The LockquidityToken contract instance.
 * @param initialAmount The initial amount of DAM to transfer to the holder.
 * @param lockAmount The amount of DAM to be locked in the test.
 * @param hookSendAmount The amount of DAM to be sent from within the ERC777 hook.
 * @param unitTestCase The specific unit test case to execute (enum value).
 */
export async function setupDamBlockingHolderTest(
	damBlockingHolder: any,
	owner: any,
	damToken: any,
	lockquidityToken: any,
	initialAmount: any,
	lockAmount: any,
	hookSendAmount: any,
	unitTestCase: any
) {
	await damBlockingHolder.connect(owner).setUnitTestCase(unitTestCase);
	expect(await damBlockingHolder.unitTestCase()).to.equal(unitTestCase);

	await damBlockingHolder.connect(owner).setHookSendAmount(hookSendAmount);

	// Transfer initialAmount DAM from owner to DamBlockingHolder contract to provide it with funds for testing.
	await damToken.connect(owner).transfer(damBlockingHolder.target, initialAmount);

	// Make sure it has initialAmount DAM to confirm the transfer was successful.
	expect(await damToken.balanceOf(damBlockingHolder.target)).to.equal(initialAmount);

	// DamBlockingHolder contract authorizes LockquidityToken. This is essential because
	// LockquidityToken needs permission to take DAM from DamBlockingHolder during lock operations.
	await damBlockingHolder.connect(owner).authorizeOperator(damToken.target, lockquidityToken.target);
}

/**
 * Prepares a DamHolder contract for locking by transferring DAM tokens to it and authorizing a lockable token contract.
 * This helper streamlines the setup for tests involving the DamHolder's interaction with locking mechanisms,
 * ensuring the holder has tokens and the locking contract has the necessary permissions.
 * @param owner The owner/signer account.
 * @param damHolder The DamHolder contract instance.
 * @param damToken The DAM token contract instance.
 * @param lockableToken The token contract that will be locking the DAM (e.g., FluxToken or LockquidityToken).
 * @param amount The amount of DAM to transfer and prepare for locking.
 */
export async function setupHolderForLocking(
	owner: any,
	damHolder: any,
	damToken: any,
	lockableToken: any,
	amount: any
) {
	// Transfer DAM from the owner to the DamHolder contract to provide it with funds.
	await damToken.connect(owner).transfer(damHolder.target, amount);
	// Authorize the LockableToken contract to spend DAM tokens on behalf of the DamHolder.
	// This is a critical step to allow the locking contract to pull tokens from the holder.
	await damHolder.connect(owner).authorizeOperator(damToken.target, lockableToken.target);
}

/**
 * Advances blocks and mints tokens (FluxToken or LockquidityToken) for a given source address.
 * This helper centralizes block advancement and minting.
 * @param token The token contract instance (FluxToken or LockquidityToken).
 * @param minter The user/signer account who is authorized to mint.
 * @param sourceAddress The address that has locked DAM and is the source of the minting.
 * @param blocksToAdvance The number of blocks to mine before minting.
 * @returns The block number after the mint transaction.
 */
export async function mintTokens(token: any, minter: any, sourceAddress: any, blocksToAdvance: number) {
	// Advance blocks to simulate time passing, which is necessary for minting rewards to accrue.
	const mintBlock = await mineBlocks(blocksToAdvance);
	// Perform the minting operation.
	await token.connect(minter).mintToAddress(sourceAddress, minter.address, mintBlock);
	return mintBlock;
}
