import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  setupHodlClickerRushTests,
  mineBlocks,
  depositFor,
  setupBurnableAddress,
  setupDefaultScenario,
} from '../helpers';

describe('HodlClickerRush Rewards', () => {
  let hodlClickerRush: any, fluxToken: any, damToken: any, owner: any, addr1: any, addr2: any, addr3: any, addr4: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
    fluxToken = setup.fluxToken;
    damToken = setup.damToken;
    owner = setup.owner;
    addr1 = setup.addr1;
    addr2 = setup.addr2;
    addr3 = setup.addr3;
    addr4 = setup.addr4;
  });

  it('should give a jackpot for the first burn in a block', async () => {
    const damAmount = ethers.parseEther('1000000');

    await setupDefaultScenario(hodlClickerRush, fluxToken, damToken, owner, addr1, damAmount);

    const burnTx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address);
    const receipt = await burnTx.wait();
    const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
    expect(event).to.not.be.undefined;
    const burnOperationResult = event.args;

    expect(burnOperationResult.jackpotAmount).to.be.gt(0);
  });

  it('should give a tip bonus even if nothing is minted', async () => {
    const damAmount = ethers.parseEther('1000000');

    await setupDefaultScenario(hodlClickerRush, fluxToken, damToken, owner, addr1, damAmount);
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);
    await depositFor(hodlClickerRush, fluxToken, damToken, addr3, damAmount);

    await ethers.provider.send('evm_setAutomine', [false]);

    const gasLimit = 300000;
    const burn1Tx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address, { gasLimit: gasLimit });
    const burn2Tx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address, { gasLimit: gasLimit });

    await mineBlocks(1);
    await ethers.provider.send('evm_setAutomine', [true]);

    const [receipt1, receipt2] = await Promise.all([burn1Tx.wait(), burn2Tx.wait()]);

    const tipBonusAwarded1 = receipt1.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');
    const tipBonusAwarded2 = receipt2.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');

    expect(tipBonusAwarded1).to.not.be.undefined;
    expect(tipBonusAwarded2).to.be.undefined;
  });

  it('should give a tip bonus based on holdings in a new block', async () => {
    const damAmount = ethers.parseEther('1000000');

    await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);
    await depositFor(hodlClickerRush, fluxToken, damToken, addr2, damAmount);
    await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);

    const totalTips = BigInt(await hodlClickerRush.totalTips());
    const totalContractRewardsAmount = BigInt(await hodlClickerRush.totalContractRewardsAmount());
    const addr2RewardsAmount = BigInt((await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount);

    const expectedTipBonus = (totalTips * addr2RewardsAmount) / totalContractRewardsAmount;

    const burnTx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address);
    const receipt = await burnTx.wait();
    const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');
    const tipBonusAwarded = event.args;

    expect(tipBonusAwarded.tipBonus).to.equal(expectedTipBonus);
  });

  it('should only give one tip bonus per block even if burning for multiple addresses (different burnToAddress)', async () => {
    const damAmount = ethers.parseEther('1000000');

    await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);
    await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);
    await setupBurnableAddress(damToken, fluxToken, owner, addr4, damAmount, hodlClickerRush);
    await hodlClickerRush.connect(owner).burnTokens(addr4.address);
    await depositFor(hodlClickerRush, fluxToken, damToken, addr2, damAmount);

    await ethers.provider.send('evm_setAutomine', [false]);

    const gasLimit = 300000;
    const burnTx1 = await hodlClickerRush.connect(addr2).burnTokens(addr1.address, { gasLimit: gasLimit });
    const burnTx2 = await hodlClickerRush.connect(addr2).burnTokens(addr4.address, { gasLimit: gasLimit });

    await mineBlocks(1);
    await ethers.provider.send('evm_setAutomine', [true]);

    const [receipt1, receipt2] = await Promise.all([burnTx1.wait(), burnTx2.wait()]);

    const tipBonusAwarded1 = receipt1.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');
    const tipBonusAwarded2 = receipt2.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');

    expect(tipBonusAwarded1).to.not.be.undefined;
    expect(tipBonusAwarded2).to.be.undefined;
  });

  it('should correctly calculate tip bonus using getTipBonus function', async () => {
    const damAmount = ethers.parseEther('1000000');

    // Setup initial state for totalTips and totalContractRewardsAmount
    await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount); // This will increase totalContractRewardsAmount
    await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address); // This will increase totalTips

    // Deposit some rewards for addr2 to set its rewardsAmount
    await depositFor(hodlClickerRush, fluxToken, damToken, addr2, ethers.parseEther('100000'));

    const totalTips = BigInt(await hodlClickerRush.totalTips());
    const totalContractRewardsAmount = BigInt(await hodlClickerRush.totalContractRewardsAmount());
    const addr2RewardsAmount = BigInt((await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount);

    let expectedTipBonus = 0n;
    if (totalContractRewardsAmount > 0) {
      expectedTipBonus = (totalTips * addr2RewardsAmount) / totalContractRewardsAmount;
    }

    const calculatedTipBonus = await hodlClickerRush.getTipBonus(addr2.address);

    expect(calculatedTipBonus).to.equal(expectedTipBonus);
  });

  it('should correctly calculate total tip and jackpot amount using getTipAndJackpotAmount function', async () => {
    const damAmount = ethers.parseEther('1000000');
    await depositFor(hodlClickerRush, fluxToken, damToken, owner, damAmount);

    // Set rewardsPercent for addr1
    await hodlClickerRush.connect(addr1).deposit(0, 500, 0, 0); // 5% rewardsPercent

    const amountToMint = ethers.parseEther('1000'); // Example amount to mint

    const expectedTotalTipAmount = (amountToMint * 500n) / 10000n;
    const expectedJackpotAmount = expectedTotalTipAmount / 2n;

    const [totalTipAmount, jackpotAmount] = await hodlClickerRush.getTipAndJackpotAmount(addr1.address, amountToMint);

    expect(totalTipAmount).to.equal(expectedTotalTipAmount);
    expect(jackpotAmount).to.equal(expectedJackpotAmount);
  });
});
