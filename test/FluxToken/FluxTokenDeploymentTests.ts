import { expect } from 'chai';
import { deployFluxTokenFixture, loadFixture, parseUnits, lockTokens } from '../helpers/index.js';

describe('FluxToken Deployment', function () {
	describe('Deployment', function () {
		it('Should lock DAM tokens', async function () {
			const { fluxToken, damToken, owner, ethers } = await loadFixture(deployFluxTokenFixture);
			const lockAmount = parseUnits('1');

			// This test verifies the core functionality of locking DAM tokens within the FluxToken contract.
			// This is fundamental because Flux tokens are minted based on these locked DAM tokens, making the successful
			// and secure locking process crucial for the entire ecosystem's operation and the integrity of the token supply.
			await lockTokens(ethers, fluxToken, damToken, owner, lockAmount);

			// Check if the tokens are correctly locked in the FluxToken contract's balance.
			const lockedBalance = await damToken.balanceOf(fluxToken.target);
			expect(lockedBalance).to.equal(lockAmount);
		});
	});
});
