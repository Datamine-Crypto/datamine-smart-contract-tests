import { expect } from 'chai';
import { ethers } from 'hardhat';
import { setupHodlClickerRushTests, mineBlocks } from '../helpers';

describe('HodlClickerRush Rewards', () => {
  let hodlClickerRush: any,
    fluxToken: any,
    damToken: any,
    owner: any,
    addr1: any,
    addr2: any,
    addr3: any,
    addr4: any,
    depositFor: any,
    setupBurnableAddress: any;

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
    depositFor = setup.depositFor;
    setupBurnableAddress = setup.setupBurnableAddress;
  });

  it('should give a jackpot for the first burn in a block', async () => {
    const damAmount = ethers.parseEther('1000000');

    await depositFor(owner, damAmount);
    await setupBurnableAddress(addr1, damAmount);

    const burnTx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address);
    const receipt = await burnTx.wait();
    const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
    expect(event).to.not.be.undefined;
    const burnOperationResult = event.args;

    expect(burnOperationResult.jackpotAmount).to.be.gt(0);
  });

  it('should give a tip bonus even if nothing is minted', async () => {
    const damAmount = ethers.parseEther('1000000');

    await depositFor(owner, damAmount);
    await setupBurnableAddress(addr1, damAmount);
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);
    await depositFor(addr3, damAmount);

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

    await depositFor(owner, damAmount);
    await depositFor(addr2, damAmount);
    await setupBurnableAddress(addr1, damAmount);
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

    await depositFor(owner, damAmount);
    await setupBurnableAddress(addr1, damAmount);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);
    await setupBurnableAddress(addr4, damAmount);
    await hodlClickerRush.connect(owner).burnTokens(addr4.address);
    await depositFor(addr2, damAmount);

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
});
