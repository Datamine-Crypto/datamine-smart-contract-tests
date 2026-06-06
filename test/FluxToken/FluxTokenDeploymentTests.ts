import { deployFluxTokenFixture } from '../helpers/fixtures/fluxToken';
import { parseUnits } from '../helpers/core/tokens';
import { testLockTokens } from '../helpers/commonTests/lockTests';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';

describe('FluxToken Deployment', function () {
	describe('Deployment', function () {
		it('Should lock DAM tokens', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
			const lockAmount = parseUnits('1');

			await testLockTokens(fluxToken, damToken, owner, lockAmount);
		});
	});
});
