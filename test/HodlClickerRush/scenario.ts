import { expect } from 'chai';
import { hodlClickerRushFixture, depositFor, setupBurnableAddress, loadFixture } from '../helpers/index';

describe('HodlClickerRush Scenarios', () => {
	it('should correctly handle the user-specified reward scenario', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, addr3, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const depositAmountA = ethers.parseEther('100');
		const depositAmountB = ethers.parseEther('200');
		const burnAmount = ethers.parseEther('10'); // A small amount to generate a small reward

		// 1. UserA deposits 100 tokens
		await depositFor(ethers, hodlClickerRush, fluxToken, damToken, addr1, depositAmountA);
		const userA_rewards_after_deposit = (await hodlClickerRush.addressLocks(addr1.address)).rewardsAmount;

		// 2. UserB deposits 200 tokens
		await depositFor(ethers, hodlClickerRush, fluxToken, damToken, addr2, depositAmountB);
		const userB_rewards_after_deposit = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;

		const totalLocked_before_burn = await hodlClickerRush.totalContractLockedAmount();
		const totalRewards_before_burn = await hodlClickerRush.totalContractRewardsAmount();

		// 3. UserC collects a gem
		await setupBurnableAddress(ethers, damToken, fluxToken, owner, addr3, burnAmount, hodlClickerRush);
		const burnTx = await hodlClickerRush.connect(addr3).burnTokens(0, addr3.address);
		const receipt = await burnTx.wait();
		const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
		expect(event).to.not.equal(undefined);
		const { jackpotAmount, totalTipToAddAmount } = event.args;

		// 4. Verify intermediate state
		const userC_rewards = (await hodlClickerRush.addressLocks(addr3.address)).rewardsAmount;
		const totalLocked_after_burn = await hodlClickerRush.totalContractLockedAmount();
		const totalRewards_after_burn = await hodlClickerRush.totalContractRewardsAmount();

		expect(userC_rewards).to.equal(jackpotAmount);
		expect(totalLocked_after_burn).to.equal(totalLocked_before_burn + jackpotAmount);
		expect(totalRewards_after_burn).to.equal(totalRewards_before_burn + jackpotAmount + totalTipToAddAmount);

		// 5. UserA withdraws
		const initialFluxBalanceA = await fluxToken.balanceOf(addr1.address);
		const expectedWithdrawAmountA = (userA_rewards_after_deposit * totalRewards_after_burn) / totalLocked_after_burn;

		const withdrawTx = await hodlClickerRush.connect(addr1).withdrawAll();
		await expect(withdrawTx)
			.to.emit(hodlClickerRush, 'Withdrawn')
			.withArgs(addr1.address, expectedWithdrawAmountA, userA_rewards_after_deposit);

		// 6. Verify final state
		const finalFluxBalanceA = await fluxToken.balanceOf(addr1.address);
		expect(finalFluxBalanceA).to.equal(initialFluxBalanceA + expectedWithdrawAmountA);

		const finalUserA_rewards = (await hodlClickerRush.addressLocks(addr1.address)).rewardsAmount;
		const finalUserB_rewards = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
		const finalUserC_rewards = (await hodlClickerRush.addressLocks(addr3.address)).rewardsAmount;
		const finalTotalLocked = await hodlClickerRush.totalContractLockedAmount();
		const finalTotalRewards = await hodlClickerRush.totalContractRewardsAmount();

		expect(finalUserA_rewards).to.equal(0);
		expect(finalUserB_rewards).to.equal(userB_rewards_after_deposit);
		expect(finalUserC_rewards).to.equal(userC_rewards);
		expect(finalTotalLocked).to.equal(totalLocked_after_burn - userA_rewards_after_deposit);
		expect(finalTotalRewards).to.equal(totalRewards_after_burn - expectedWithdrawAmountA);
	});

	it('should correctly handle batch burning via burnTokensFromAddresses', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, addr3, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		const depositAmount = ethers.parseEther('10000000'); // Increased deposit amount

		// 1. Deposit funds into the contract to have rewards to distribute
		await depositFor(ethers, hodlClickerRush, fluxToken, damToken, owner, depositAmount);

		// 2. Setup multiple burnable addresses
		await setupBurnableAddress(ethers, damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
		await setupBurnableAddress(ethers, damToken, fluxToken, owner, addr2, damAmount, hodlClickerRush);
		await setupBurnableAddress(ethers, damToken, fluxToken, owner, addr3, damAmount, hodlClickerRush);

		// 3. Pause one of the addresses to test failure case handling
		await hodlClickerRush.connect(addr3).setPaused(true);

		// 4. Construct the burn requests array
		const requests = [
			{ amountToBurn: 0, burnToAddress: addr1.address }, // Should succeed
			{ amountToBurn: 0, burnToAddress: addr2.address }, // Should succeed
			{ amountToBurn: 0, burnToAddress: addr3.address }, // Should fail (paused)
		];

		// 5. Get the caller's initial rewards balance
		const callerInitialRewards = (await hodlClickerRush.addressLocks(owner.address)).rewardsAmount;

		// 6. Execute the transaction
		const tx = await hodlClickerRush.connect(owner).burnTokensFromAddresses(requests);
		const receipt = await tx.wait();

		// 7. Calculate total jackpot from events
		const events = receipt.logs.filter((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
		expect(events.length).to.equal(2); // Only two successful burns

		const totalJackpotFromEvents = events.reduce((total: any, event: any) => total + event.args.jackpotAmount, 0n);
		expect(totalJackpotFromEvents).to.be.gt(0);

		// 8. Check the final rewards for the caller
		const callerFinalRewards = (await hodlClickerRush.addressLocks(owner.address)).rewardsAmount;
		const expectedRewards = callerInitialRewards + totalJackpotFromEvents;

		expect(callerFinalRewards).to.equal(expectedRewards);
	});
});
