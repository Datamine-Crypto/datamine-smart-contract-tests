import { parseUnits } from '../helpers/common';
import { testMintPastLockPeriodAfterReLock } from '../helpers/commonTests';
import { deployFluxTokenFixture } from '../helpers/fixtures/fluxToken';
import { loadFixture } from '../helpers/fixtureRunner';

describe('FluxToken Attack Scenarios', function () {
	describe('Attack Scenarios', function () {
		it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
			const lockAmount = parseUnits('100');

			await testMintPastLockPeriodAfterReLock(fluxToken, damToken, owner, lockAmount);
		});
	});
});
