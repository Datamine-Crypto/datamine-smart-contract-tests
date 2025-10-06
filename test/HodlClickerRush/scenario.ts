import { expect } from 'chai';
import { ethers } from 'hardhat';
import { setupHodlClickerRushTests, setupPlayerForHodlClicker, setupBurnableAddress, depositFor } from '../helpers';

describe('HodlClickerRush Scenarios', () => {
  let hodlClickerRush: any, fluxToken: any, damToken: any, owner: any, addr1: any, addr2: any, addr3: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
    fluxToken = setup.fluxToken;
    damToken = setup.damToken;
    owner = setup.owner;
    addr1 = setup.addr1;
    addr2 = setup.addr2;
    addr3 = setup.addr3;
  });

  it('should correctly handle the user-specified reward scenario', async () => {
    const depositAmountA = ethers.parseEther('100');
    const depositAmountB = ethers.parseEther('200');
    const burnAmount = ethers.parseEther('10'); // A small amount to generate a small reward

    // 1. UserA deposits 100 tokens
    await depositFor(hodlClickerRush, fluxToken, damToken, addr1, depositAmountA);
    const userA_rewards_after_deposit = (await hodlClickerRush.addressLocks(addr1.address)).rewardsAmount;

    // 2. UserB deposits 200 tokens
    await depositFor(hodlClickerRush, fluxToken, damToken, addr2, depositAmountB);
    const userB_rewards_after_deposit = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;

    const totalLocked_before_burn = await hodlClickerRush.totalContractLockedAmount();
    const totalRewards_before_burn = await hodlClickerRush.totalContractRewardsAmount();

    // 3. UserC collects a gem
    await setupBurnableAddress(damToken, fluxToken, owner, addr3, burnAmount, hodlClickerRush);
    const burnTx = await hodlClickerRush.connect(addr3).burnTokens(0, addr3.address);
    const receipt = await burnTx.wait();
    const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
    expect(event).to.not.be.undefined;
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
});
