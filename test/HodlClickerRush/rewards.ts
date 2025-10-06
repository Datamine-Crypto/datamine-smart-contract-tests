import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  setupHodlClickerRushTests,
  depositFor,
  setupDefaultScenario,
} from '../helpers';

describe('HodlClickerRush Rewards', () => {
  let hodlClickerRush: any, fluxToken: any, damToken: any, owner: any, addr1: any, addr2: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
    fluxToken = setup.fluxToken;
    damToken = setup.damToken;
    owner = setup.owner;
    addr1 = setup.addr1;
    addr2 = setup.addr2;
  });

  it('should give a jackpot and update rewards correctly', async () => {
    const damAmount = ethers.parseEther('1000000');

    await setupDefaultScenario(hodlClickerRush, fluxToken, damToken, owner, addr1, damAmount);

    const initialTotalLocked = await hodlClickerRush.totalContractLockedAmount();
    const initialTotalRewards = await hodlClickerRush.totalContractRewardsAmount();
    const initialAddr2Rewards = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;

    const burnTx = await hodlClickerRush.connect(addr2).burnTokens(0, addr1.address);
    const receipt = await burnTx.wait();
    const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
    const { jackpotAmount, totalTipToAddAmount } = event.args;

    const finalTotalLocked = await hodlClickerRush.totalContractLockedAmount();
    const finalTotalRewards = await hodlClickerRush.totalContractRewardsAmount();
    const finalAddr2Rewards = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;

    expect(jackpotAmount).to.be.gt(0);
    expect(finalAddr2Rewards).to.equal(initialAddr2Rewards + jackpotAmount);
    expect(finalTotalLocked).to.equal(initialTotalLocked + jackpotAmount);
    expect(finalTotalRewards).to.equal(initialTotalRewards + jackpotAmount + totalTipToAddAmount);
  });

  /**
   * @dev Tests the getTipAndJackpotAmount function to ensure it correctly calculates
   * the total tip amount and jackpot amount based on the provided address's rewards percent
   * and the amount to mint before burn.
   */
  it('should correctly calculate total tip and jackpot amount using getTipAndJackpotAmount function', async () => {
    const damAmount = ethers.parseEther('1000000');
    await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);

    // Set rewardsPercent for addr1
    await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr1).deposit(0, 500, 0, 0); // 5% rewardsPercent

    const amountToMint = ethers.parseEther('1000'); // Example amount to mint

    const expectedTotalTipAmount = (amountToMint * 500n) / 10000n;
    const expectedJackpotAmount = expectedTotalTipAmount / 2n;

    const [totalTipAmount, jackpotAmount] = await hodlClickerRush.getTipAndJackpotAmount(addr1.address, amountToMint);

    expect(totalTipAmount).to.equal(expectedTotalTipAmount);
    expect(jackpotAmount).to.equal(expectedJackpotAmount);
  });
});
