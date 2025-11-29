import { parseUnits } from '../helpers/common';
import { testTokenBurn } from '../helpers/commonTests';
import { deployDamTokenFixture } from '../helpers/fixtures/damToken';
import { loadFixture } from '../helpers/fixtureRunner';

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
