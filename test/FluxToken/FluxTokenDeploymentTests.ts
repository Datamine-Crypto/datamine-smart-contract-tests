import { deployFluxTokenFixture } from '../helpers/fixtures/fluxToken';
import { parseUnits } from '../helpers/common';
import { testLockTokens } from '../helpers/commonTests';
import { loadFixture } from '../helpers/fixtureRunner';

describe('FluxToken Deployment', function () {
	describe('Deployment', function () {
		it('Should lock DAM tokens', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
			const lockAmount = parseUnits('1');

			await testLockTokens(fluxToken, damToken, owner, lockAmount);
		});
	});
});
