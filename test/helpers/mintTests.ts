import { expect } from 'chai';
import { RevertMessages } from './constants';
import { mineBlocks } from './blockchain';

/**
 * A generic helper to test that it is not possible to mint tokens for a past lock period after re-locking.
 */
export async function testMintPastLockPeriodAfterReLock(token: any, damToken: any, owner: any, lockAmount: bigint) {
	const { mintTokens } = await import('./setupHelpers');
	const { lockTokens } = await import('./tokens');

	// First lock to establish an initial state.
	await lockTokens(token, damToken, owner, lockAmount);

	// Mint after 10 blocks to record a lastMintBlockNumber.
	const mintBlock1 = await mintTokens(token, owner, owner.address, 10);

	// Unlock and then re-lock to simulate a user re-engaging with the system.
	await token.connect(owner).unlock();
	await mineBlocks(10);
	await lockTokens(token, damToken, owner, lockAmount);

	// Attempt to mint again using the *old* mint block number (mintBlock1).
	await expect(token.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1)).to.be.revertedWith(
		RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK
	);
}

/**
 * A generic helper to test that minting reverts if targetBlock is in the future.
 */
export async function testMintRevertFutureBlock(token: any, owner: any, ethers: any) {
	const futureBlock = (await ethers.provider.getBlockNumber()) + 100;
	await expect(token.connect(owner).mintToAddress(owner.address, owner.address, futureBlock)).to.be.revertedWith(
		RevertMessages.YOU_CAN_ONLY_MINT_UP_TO_CURRENT_BLOCK
	);
}

/**
 * A generic helper to test that minting reverts if targetBlock is before lastMintBlockNumber.
 */
export async function testMintRevertBeforeLastMint(token: any, owner: any) {
	const { mintTokens } = await import('./setupHelpers');
	const blockAfterLock = await mintTokens(token, owner, owner.address, 1);
	await expect(token.connect(owner).mintToAddress(owner.address, owner.address, blockAfterLock)).to.be.revertedWith(
		RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK
	);
}

/**
 * A generic helper to test that minting reverts if caller is not the minterAddress.
 */
export async function testMintRevertNotMinter(token: any, owner: any, otherAccount: any) {
	const block = await mineBlocks(1);
	await expect(
		token.connect(otherAccount).mintToAddress(owner.address, otherAccount.address, block)
	).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
}

/**
 * A generic helper to test successful token minting based on time progression.
 */
export async function testSuccessfulMint(token: any, owner: any) {
	const mintBlock = await mineBlocks(1);
	const expectedMintAmount = await token.getMintAmount(owner.address, mintBlock);
	await token.connect(owner).mintToAddress(owner.address, owner.address, mintBlock);

	const balance = await token.balanceOf(owner.address);
	expect(balance).to.equal(expectedMintAmount);
}
