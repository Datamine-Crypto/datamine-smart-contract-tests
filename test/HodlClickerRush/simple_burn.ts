import { expect } from 'chai';
import { hodlClickerRushFixture } from '../helpers/fixtures/hodlClickerRush';
import { setupBurnableAddress, depositFor } from '../helpers/hodlClickerRush';
import { BurnResultCode } from '../helpers/common';
import { loadFixture } from '../helpers/fixtureRunner';

describe('HodlClickerRush Simple Burn', () => {
	it('should return InsufficientContractBalance if not enough FLUX is deposited', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);

		const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(0, addr1.address);

		expect(burnOperationResult.resultCode).to.equal(BurnResultCode.InsufficientContractBalance);
	});

	it('should successfully burn tokens if enough FLUX is deposited', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');

		await depositFor(hodlClickerRush, fluxToken, damToken, addr1, damAmount);
		await setupBurnableAddress(damToken, fluxToken, owner, addr2, damAmount, hodlClickerRush);

		const burnOperationResult = await hodlClickerRush.connect(owner).burnTokens.staticCall(0, addr2.address);

		expect(burnOperationResult.resultCode).to.equal(BurnResultCode.Success);
	});
});
