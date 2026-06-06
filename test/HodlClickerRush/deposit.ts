import { expect } from 'chai';
import { hodlClickerRushFixture } from '../helpers/fixtures/hodlClickerRush';
import { setupPlayerForHodlClickerRush, depositFor, setupBurnableAddress } from '../helpers/game/hodlClickerRush';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';
import { EventNames, RevertMessages } from '../helpers/core/constants';

describe('HodlClickerRush Deposit', () => {
	it('should allow depositing and calculate actualAmountToDeposit correctly when contract is empty', async () => {
		const { hodlClickerRush, fluxToken, damToken, addr1, ethers } = await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		const addr1FluxBalance = await setupPlayerForHodlClickerRush(
			hodlClickerRush,
			fluxToken,
			damToken,
			addr1,
			damAmount,
			addr1.address
		);

		await expect(hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 10000, 0, 0))
			.to.emit(hodlClickerRush, EventNames.Deposited)
			.withArgs(addr1.address, addr1FluxBalance, 10000, addr1FluxBalance, 0, 0, addr1FluxBalance);

		const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
		expect(addr1Lock.rewardsAmount).to.equal(addr1FluxBalance);
	});

	it('should calculate actualAmountToDeposit correctly when rewards have been added to the pool', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');

		// First, owner deposits to add to the locked and rewards amount
		await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);

		// Then, a burn happens which adds to the rewards pool, making rewards > locked
		await setupBurnableAddress(damToken, fluxToken, owner, addr2, damAmount, hodlClickerRush);
		await hodlClickerRush.connect(owner).burnTokens(0, addr2.address);

		const totalContractLockedAmount = await hodlClickerRush.totalContractLockedAmount();
		const totalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();
		expect(totalContractRewardsAmount).to.be.gt(totalContractLockedAmount);

		// Now, addr1 deposits
		const addr1FluxBalance = await setupPlayerForHodlClickerRush(
			hodlClickerRush,
			fluxToken,
			damToken,
			addr1,
			damAmount,
			addr1.address
		);

		const expectedActualAmount = (addr1FluxBalance * totalContractLockedAmount) / totalContractRewardsAmount;

		await expect(hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 500, 0, 0))
			.to.emit(hodlClickerRush, EventNames.Deposited)
			.withArgs(addr1.address, addr1FluxBalance, 500, expectedActualAmount, 0, 0, expectedActualAmount);

		const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
		expect(addr1Lock.rewardsAmount).to.equal(expectedActualAmount);
	});

	it('should revert when depositing with rewardsPercent above maximum', async () => {
		const { hodlClickerRush, fluxToken, damToken, addr1, ethers } = await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		const addr1FluxBalance = await setupPlayerForHodlClickerRush(
			hodlClickerRush,
			fluxToken,
			damToken,
			addr1,
			damAmount,
			addr1.address
		);

		await expect(hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 10001, 0, 0)).to.be.revertedWith(
			RevertMessages.REWARDS_PERCENT_MUST_BE_LESS_OR_EQUAL_10000
		);
	});

	it('should store minBlockNumber and minBurnAmount correctly', async () => {
		const { hodlClickerRush, fluxToken, damToken, addr1, ethers } = await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		const addr1FluxBalance = await setupPlayerForHodlClickerRush(
			hodlClickerRush,
			fluxToken,
			damToken,
			addr1,
			damAmount,
			addr1.address
		);

		const testMinBlockNumber = 5000;
		const testMinBurnAmount = ethers.parseEther('100');

		await hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 500, testMinBlockNumber, testMinBurnAmount);

		const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
		expect(addr1Lock.minBlockNumber).to.equal(testMinBlockNumber);
		expect(addr1Lock.minBurnAmount).to.equal(testMinBurnAmount);
	});

	it('should result in 0 actualAmountToDeposit when depositing a very small amount (dust) under high rewards-to-locked ratio', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');

		// 1. Owner deposits a decent amount
		await depositFor(hodlClickerRush, fluxToken, damToken, owner, ethers.parseEther('100'));

		// 2. Perform a burn to generate rewards and create a reward-to-locked ratio > 1
		await setupBurnableAddress(damToken, fluxToken, owner, addr2, ethers.parseEther('10'), hodlClickerRush);
		const burnTx = await hodlClickerRush.connect(owner).burnTokens(0, addr2.address);
		await expect(burnTx).to.emit(hodlClickerRush, EventNames.TokensBurned);

		// Verify rewards are greater than locked
		const totalContractLockedAmount = await hodlClickerRush.totalContractLockedAmount();
		const totalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();
		expect(totalContractRewardsAmount).to.be.gt(totalContractLockedAmount);

		// 3. Addr1 tries to deposit 1 wei of FLUX
		await setupPlayerForHodlClickerRush(hodlClickerRush, fluxToken, damToken, addr1, damAmount, addr1.address);
		const depositAmount = 1n; // 1 wei

		// actualAmountToDeposit = (depositAmount * totalContractLockedAmount) / totalContractRewardsAmount
		// Since depositAmount = 1 and locked < rewards, actualAmountToDeposit will round to 0.
		const expectedActualAmount = (depositAmount * totalContractLockedAmount) / totalContractRewardsAmount;
		expect(expectedActualAmount).to.equal(0);

		// Deposit 1 wei
		await expect(hodlClickerRush.connect(addr1).deposit(depositAmount, 500, 0, 0))
			.to.emit(hodlClickerRush, EventNames.Deposited)
			.withArgs(addr1.address, depositAmount, 500, 0, 0, 0, 0);

		// AddressLock.rewardsAmount should be 0 because actualAmountToDeposit was 0.
		const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
		expect(addr1Lock.rewardsAmount).to.equal(0);
	});
});
