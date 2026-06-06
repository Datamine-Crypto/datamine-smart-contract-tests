import { parseUnits } from '../helpers/core/tokens';
import { testTokenBurn } from '../helpers/commonTests/burnTests';
import { deployDamTokenFixture } from '../helpers/fixtures/damToken';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';

describe('DamToken Burning', function () {
	describe('Burning', function () {
		it('should ensure supply burns properly via operator', async function () {
			const { damToken, owner, operatorAddress } = await loadFixture(deployDamTokenFixture);
			const burnAmount = parseUnits('1000');
			// This test validates the delegated burning functionality, ensuring that an authorized operator can successfully
			// burn DamTokens on behalf of the owner. This is a crucial ERC777 feature that enables flexible token management
			// and delegated operations, which is vital for various ecosystem functionalities.
			await testTokenBurn(damToken, owner, operatorAddress, burnAmount);
		});
	});
});
