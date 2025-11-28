import { expect } from 'chai';
import {
	RevertMessages,
	lockTokens,
	mineBlocks,
	mintLockTokens,
	deployLockTokenFixture,
	loadFixture,
} from '../helpers/index';

describe('LockToken Attack Scenarios', function () {
	describe('Attack Scenarios', function () {
		it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
			// This test simulates an attack scenario where a user attempts to exploit the minting mechanism by re-locking tokens
			// and then trying to mint for a past block number from a previous lock period. This is crucial to prevent
			// double-dipping on rewards or manipulating the token supply by re-using historical lock data, thereby ensuring
			// the integrity and fairness of the minting process.
			const { lockquidityToken, damToken, owner, ethers } = await loadFixture(deployLockTokenFixture);
			const lockAmount = ethers.parseUnits('100', 18);

			// First lock
			await lockTokens(ethers, lockquidityToken, damToken, owner, lockAmount);

			// Mint after 10 blocks
			const mintBlock1 = await mintLockTokens(ethers, lockquidityToken, owner, owner.address, 10);

			// Unlock
			await lockquidityToken.connect(owner).unlock();
			await mineBlocks(ethers, 10);

			// Re-lock
			await lockTokens(ethers, lockquidityToken, damToken, owner, lockAmount);

			// Try to mint again with the old mint block.
			// This should fail because the last mint block is now the re-lock block.
			await expect(
				lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1)
			).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);
		});
	});
});
