import { expect } from 'chai';
import { hodlClickerRushFixture } from '../helpers/fixtures/hodlClickerRush';
import { setupDefaultScenario } from '../helpers/hodlClickerRush';
import { BurnResultCode } from '../helpers/common';
import { loadFixture } from '../helpers/fixtureRunner';

describe('HodlClickerRush Pause', () => {
	it('should allow an address to pause itself', async () => {
		const { hodlClickerRush, addr1 } = await loadFixture(hodlClickerRushFixture);
		await hodlClickerRush.connect(addr1).setPaused(true);
		const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
		expect(addr1Lock.isPaused).to.equal(true);
	});

	it('should allow an address to unpause itself', async () => {
		const { hodlClickerRush, addr1 } = await loadFixture(hodlClickerRushFixture);
		await hodlClickerRush.connect(addr1).setPaused(true);
		let addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
		expect(addr1Lock.isPaused).to.equal(true);

		await hodlClickerRush.connect(addr1).setPaused(false);
		addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
		expect(addr1Lock.isPaused).to.equal(false);
	});

	it('should prevent a paused address from burning tokens', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');

		await setupDefaultScenario(hodlClickerRush, fluxToken, damToken, owner, addr1, damAmount);

		await hodlClickerRush.connect(addr1).setPaused(true);

		const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(0, addr1.address);
		expect(burnOperationResult.resultCode).to.equal(BurnResultCode.ValidatorPaused);
	});

	it('should allow an unpaused address to burn tokens', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');

		await setupDefaultScenario(hodlClickerRush, fluxToken, damToken, owner, addr1, damAmount);

		await hodlClickerRush.connect(addr1).setPaused(false);

		const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(0, addr1.address);
		expect(burnOperationResult.resultCode).to.equal(BurnResultCode.Success);
	});

	it('should emit PausedChanged event', async () => {
		const { hodlClickerRush, addr1 } = await loadFixture(hodlClickerRushFixture);
		await expect(hodlClickerRush.connect(addr1).setPaused(true))
			.to.emit(hodlClickerRush, 'PausedChanged')
			.withArgs(addr1.address, true);

		await expect(hodlClickerRush.connect(addr1).setPaused(false))
			.to.emit(hodlClickerRush, 'PausedChanged')
			.withArgs(addr1.address, false);
	});
});
