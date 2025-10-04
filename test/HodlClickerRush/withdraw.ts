import { expect } from 'chai';
import { ethers } from 'hardhat';
import { setupHodlClickerRushTests, depositFor, setupBurnableAddress } from '../helpers';

describe('HodlClickerRush Withdraw', () => {
  let hodlClickerRush: any, owner: any, addr1: any, addr2: any, damToken: any, fluxToken: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
    owner = setup.owner;
    addr1 = setup.addr1;
    addr2 = setup.addr2;
    damToken = setup.damToken;
    fluxToken = setup.fluxToken;
  });

  it('should allow a user to withdraw earned rewards and their share of tips', async () => {
    const damAmount = ethers.parseEther('1000000');

    // 1. addr2 deposits, startingTotalTips for addr2 is 0
    await depositFor(hodlClickerRush, fluxToken, damToken, addr2, damAmount);
    const addr2AddressLockInitial = await hodlClickerRush.addressLocks(addr2.address);
    expect(addr2AddressLockInitial.startingTotalTips).to.equal(0);

    // 2. owner generates some totalTips by burning
    await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);

    const totalTipsAfterBurn = await hodlClickerRush.totalTips();
    expect(totalTipsAfterBurn).to.be.gt(0);

    // 3. Get state before withdrawal
    const initialRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    const initialTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();
    const initialTotalTips = await hodlClickerRush.totalTips();
    const addr2StartingTotalTips = (await hodlClickerRush.addressLocks(addr2.address)).startingTotalTips;

    // 4. Calculate expected tipBonus
    const expectedTipBonus = ((initialTotalTips - addr2StartingTotalTips) * initialRewardsAmount) / initialTotalContractRewardsAmount;

    const initialFluxBalance = await fluxToken.balanceOf(addr2.address);

    // 5. Withdraw
    const withdrawTx = await hodlClickerRush.connect(addr2).withdrawAll();
    await expect(withdrawTx)
        .to.emit(hodlClickerRush, 'Withdrawn')
        .withArgs(addr2.address, initialRewardsAmount + expectedTipBonus);

    // 6. Check final state
    const finalRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    const finalTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();
    const finalTotalTips = await hodlClickerRush.totalTips();
    const finalFluxBalance = await fluxToken.balanceOf(addr2.address);

    expect(finalRewardsAmount).to.equal(0);
    expect(finalTotalContractRewardsAmount).to.equal(initialTotalContractRewardsAmount - initialRewardsAmount);
    expect(finalTotalTips).to.equal(initialTotalTips - expectedTipBonus);
    expect(finalFluxBalance).to.equal(initialFluxBalance + initialRewardsAmount + expectedTipBonus);
  });

  it('should not allow withdrawing more than earned rewards', async () => {
    const damAmount = ethers.parseEther('1000000');

    await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);
    await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);
    await depositFor(hodlClickerRush, fluxToken, damToken, addr2, damAmount);
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);

    await hodlClickerRush.connect(addr2).withdrawAll();
    const addr2RewardsAfter = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    expect(addr2RewardsAfter).to.equal(0);
    await expect(hodlClickerRush.connect(addr2).withdrawAll()).to.be.revertedWith('No rewards to withdraw');
  });

  it('should not allow withdrawing zero amount', async () => {
    await expect(hodlClickerRush.connect(addr1).withdrawAll()).to.be.revertedWith('No rewards to withdraw');
  });
});
