import { expect } from 'chai';
import { hodlClickerRushFixture } from '../helpers/fixtures/hodlClickerRush';
import { depositFor, setupBurnableAddress } from '../helpers/hodlClickerRush';
import { loadFixture } from '../helpers/fixtureRunner';

describe('HodlClickerRush Withdraw', () => {
	it('should allow a user to withdraw their proportional share of rewards', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');

		// 1. addr2 deposits
		await depositFor(hodlClickerRush, fluxToken, damToken, addr2, damAmount);

		// 2. owner generates some rewards, making totalContractRewardsAmount > totalContractLockedAmount
		await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);
		await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
		await hodlClickerRush.connect(owner).burnTokens(0, addr1.address);

		// 3. Get state before withdrawal
		const initialRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
		const initialTotalContractLockedAmount = await hodlClickerRush.totalContractLockedAmount();
		const initialTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();
		const initialFluxBalance = await fluxToken.balanceOf(addr2.address);

		// 4. Calculate expected withdraw amount
		const expectedWithdrawAmount =
			(initialRewardsAmount * initialTotalContractRewardsAmount) / initialTotalContractLockedAmount;

		// 5. Withdraw
		const withdrawTx = await hodlClickerRush.connect(addr2).withdrawAll();
		await expect(withdrawTx)
			.to.emit(hodlClickerRush, 'Withdrawn')
			.withArgs(addr2.address, expectedWithdrawAmount, initialRewardsAmount);

		// 6. Check final state
		const finalRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
		const finalTotalContractLockedAmount = await hodlClickerRush.totalContractLockedAmount();
		const finalTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();
		const finalFluxBalance = await fluxToken.balanceOf(addr2.address);

		expect(finalRewardsAmount).to.equal(0);
		expect(finalTotalContractLockedAmount).to.equal(initialTotalContractLockedAmount - initialRewardsAmount);
		expect(finalTotalContractRewardsAmount).to.equal(initialTotalContractRewardsAmount - expectedWithdrawAmount);
		expect(finalFluxBalance).to.equal(initialFluxBalance + expectedWithdrawAmount);
	});

	it('should not allow withdrawing more than earned rewards', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');

		await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);
		await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
		await hodlClickerRush.connect(owner).burnTokens(0, addr1.address);
		await depositFor(hodlClickerRush, fluxToken, damToken, addr2, damAmount);

		await hodlClickerRush.connect(addr2).withdrawAll();
		const addr2RewardsAfter = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
		expect(addr2RewardsAfter).to.equal(0);
		await expect(hodlClickerRush.connect(addr2).withdrawAll()).to.be.revertedWith('No rewards to withdraw');
	});

	it('should not allow withdrawing zero amount', async () => {
		const { hodlClickerRush, addr1 } = await loadFixture(hodlClickerRushFixture);
		await expect(hodlClickerRush.connect(addr1).withdrawAll()).to.be.revertedWith('No rewards to withdraw');
	});
});
