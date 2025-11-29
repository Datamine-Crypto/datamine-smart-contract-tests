import { expect } from 'chai';
import { lockTokens, RevertMessages } from '../helpers/common';
import { deployLockTokenFixture } from '../helpers/fixtures/lockToken';
import { loadFixture } from '../helpers/fixtureRunner';

describe('LockToken Unlock', function () {
	describe('Unlock', function () {
		it('Should allow a user to unlock their tokens', async function () {
			const { ethers, lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
			const lockAmount = ethers.parseUnits('100', 18);

			await lockTokens(lockquidityToken, damToken, owner, lockAmount);

			// Unlock tokens
			await lockquidityToken.connect(owner).unlock();

			// Verify that the user's DAM token balance is restored
			expect(await damToken.balanceOf(owner.address)).to.equal(ethers.parseUnits('25000000', 18)); // Initial balance
		});

		/**
		 * @dev This test validates the access control and state management of the `unlock` function.
		 * It's critical to prevent unauthorized or erroneous unlocks, ensuring that only users with active locked tokens
		 * can perform this action, thus maintaining the integrity of the locking mechanism.
		 */
		it('Should revert if a user tries to unlock without having locked tokens', async function () {
			const { lockquidityToken, owner } = await loadFixture(deployLockTokenFixture);

			await expect(lockquidityToken.connect(owner).unlock()).to.be.revertedWith(
				RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS
			);
		});
	});
});
