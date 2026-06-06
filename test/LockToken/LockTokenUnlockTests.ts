import { RevertMessages } from '../helpers/core/constants';
import {
	testRevertUnlockWithoutLockedTokens,
	testRevertLockWhenAlreadyLocked,
	testLockAndUnlock,
	testRevertLockAndUnlockSameBlock,
} from '../helpers/commonTests/lockTests';
import { deployLockTokenFixture } from '../helpers/fixtures/lockToken';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';

describe('LockToken Unlock', function () {
	describe('Unlock', function () {
		it('Should allow a user to unlock their tokens', async function () {
			const { ethers, lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
			const lockAmount = ethers.parseUnits('100', 18);

			await testLockAndUnlock(lockquidityToken, damToken, owner, lockAmount);
		});

		/**
		 * @dev This test validates the access control and state management of the `unlock` function.
		 * It's critical to prevent unauthorized or erroneous unlocks, ensuring that only users with active locked tokens
		 * can perform this action, thus maintaining the integrity of the locking mechanism.
		 */
		it('Should revert if a user tries to unlock without having locked tokens', async function () {
			const { lockquidityToken, owner } = await loadFixture(deployLockTokenFixture);

			await testRevertUnlockWithoutLockedTokens(
				lockquidityToken,
				owner,
				RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS
			);
		});

		it('Should revert when attempting to lock tokens when already locked', async function () {
			const { ethers, lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
			const lockAmount = ethers.parseUnits('100', 18);

			await testRevertLockWhenAlreadyLocked(
				lockquidityToken,
				damToken,
				owner,
				lockAmount,
				RevertMessages.YOU_MUST_HAVE_UNLOCKED_YOUR_ARBI_FLUX_TOKENS
			);
		});

		it('Should revert when attempting to lock and unlock/lock in the same block', async function () {
			const { ethers, lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
			const lockAmount = ethers.parseUnits('100', 18);

			await testRevertLockAndUnlockSameBlock(lockquidityToken, damToken, owner, lockAmount);
		});
	});
});
