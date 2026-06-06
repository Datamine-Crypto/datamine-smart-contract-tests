import { RevertMessages } from '../helpers/core/constants';
import {
	testReentrancyOnBurn,
	testRevertBurnZeroAmount,
	testRevertBurnToUnlockedAddress,
} from '../helpers/commonTests/burnTests';
import { testRevertLockZeroAmount } from '../helpers/commonTests/lockTests';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';
import { deployLockTokenAttackFixture } from '../helpers/fixtures/lockToken';

describe('LockToken - Attack Scenarios', function () {
	describe('Re-entrancy on burnToAddress', function () {
		it('Should prevent re-entrancy on burnToAddress and not burn twice', async function () {
			const { lockquidityToken, damToken, unlockAttacker, owner, attackerAccount } =
				await loadFixture(deployLockTokenAttackFixture);
			const burnAmount = 100n;

			await testReentrancyOnBurn(lockquidityToken, damToken, unlockAttacker, owner, attackerAccount, burnAmount);
		});
	});

	describe('Direct validation checks', function () {
		it('Should revert if lock amount is 0', async function () {
			const { lockquidityToken, owner } = await loadFixture(deployLockTokenAttackFixture);
			await testRevertLockZeroAmount(lockquidityToken, owner);
		});

		it('Should revert if burn amount is 0', async function () {
			const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenAttackFixture);
			await testRevertBurnZeroAmount(
				lockquidityToken,
				damToken,
				owner,
				RevertMessages.YOU_MUST_BURN_GREATER_THAN_ZERO_LOCK
			);
		});

		it('Should revert if burning to an unlocked address', async function () {
			const { lockquidityToken, damToken, owner, otherAccount } = await loadFixture(deployLockTokenAttackFixture);
			await testRevertBurnToUnlockedAddress(
				lockquidityToken,
				damToken,
				owner,
				otherAccount,
				RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS
			);
		});
	});
});
