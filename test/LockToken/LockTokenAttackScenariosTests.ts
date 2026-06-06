import { testMintPastLockPeriodAfterReLock } from '../helpers/commonTests';
import { deployLockTokenFixture } from '../helpers/fixtures/lockToken';
import { loadFixture } from '../helpers/fixtureRunner';

describe('LockToken Attack Scenarios', function () {
	describe('Attack Scenarios', function () {
		it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
			const { lockquidityToken, damToken, owner, ethers } = await loadFixture(deployLockTokenFixture);
			const lockAmount = ethers.parseUnits('100', 18);

			await testMintPastLockPeriodAfterReLock(lockquidityToken, damToken, owner, lockAmount);
		});
	});
});
