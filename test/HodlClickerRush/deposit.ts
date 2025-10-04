import { expect } from 'chai';
import { ethers } from 'hardhat';
import { setupHodlClickerRushTests, setupPlayerForHodlClicker } from '../helpers';

describe('HodlClickerRush Deposit', () => {
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

  it('should allow depositing with maximum rewardsPercent (10000)', async () => {
    const damAmount = ethers.parseEther('1000000');
    const addr1FluxBalance = await setupPlayerForHodlClicker(
      hodlClickerRush,
      fluxToken,
      damToken,
      addr1,
      damAmount,
      addr1.address,
    );

    await expect(hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 10000, 0, 0))
      .to.emit(hodlClickerRush, 'Deposited')
      .withArgs(addr1.address, addr1FluxBalance, 10000, addr1FluxBalance, 0, 0);

    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.rewardsPercent).to.equal(10000);
  });

  it('should allow depositing with zero rewardsPercent', async () => {
    const damAmount = ethers.parseEther('1000000');
    const addr1FluxBalance = await setupPlayerForHodlClicker(
      hodlClickerRush,
      fluxToken,
      damToken,
      addr1,
      damAmount,
      addr1.address,
    );

    await expect(hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 0, 0, 0))
      .to.emit(hodlClickerRush, 'Deposited')
      .withArgs(addr1.address, addr1FluxBalance, 0, addr1FluxBalance, 0, 0);

    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.rewardsPercent).to.equal(0);
  });

  it('should revert when depositing with rewardsPercent above maximum', async () => {
    const damAmount = ethers.parseEther('1000000');
    const addr1FluxBalance = await setupPlayerForHodlClicker(
      hodlClickerRush,
      fluxToken,
      damToken,
      addr1,
      damAmount,
      addr1.address,
    );

    await expect(hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 10001, 0, 0)).to.be.revertedWith(
      'Rewards % must be <= 10000',
    );
  });

  it('should store minBlockNumber and minBurnAmount correctly', async () => {
    const damAmount = ethers.parseEther('1000000');
    const addr1FluxBalance = await setupPlayerForHodlClicker(
      hodlClickerRush,
      fluxToken,
      damToken,
      addr1,
      damAmount,
      addr1.address,
    );

    const testMinBlockNumber = 5000;
    const testMinBurnAmount = ethers.parseEther('100');

    await hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 500, testMinBlockNumber, testMinBurnAmount);

    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.minBlockNumber).to.equal(testMinBlockNumber);
    expect(addr1Lock.minBurnAmount).to.equal(testMinBurnAmount);
  });

  it('should emit Deposited event with correct arguments for zero deposit amount', async () => {
    // No need to transfer DAM or mint FLUX if depositing 0 amount
    await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);

    await expect(hodlClickerRush.connect(addr1).deposit(0, 500, 0, 0))
      .to.emit(hodlClickerRush, 'Deposited')
      .withArgs(addr1.address, 0, 500, 0, 0, 0); // rewardsAmount should be 0 if initial deposit is 0

    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.rewardsAmount).to.equal(0);
  });

  it('should update lastTipBonusBlock on deposit', async () => {
    const damAmount = ethers.parseEther('1000000');
    const addr1FluxBalance = await setupPlayerForHodlClicker(
      hodlClickerRush,
      fluxToken,
      damToken,
      addr1,
      damAmount,
      addr1.address,
    );

    const initialLastTipBonusBlock = (await hodlClickerRush.addressLocks(addr1.address)).lastTipBonusBlock;

    const tx = await hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 10000, 0, 0);
    const receipt = await tx.wait();
    const blockNumber = receipt.blockNumber;

    const finalLastTipBonusBlock = (await hodlClickerRush.addressLocks(addr1.address)).lastTipBonusBlock;

    expect(finalLastTipBonusBlock).to.be.gt(initialLastTipBonusBlock);
    expect(finalLastTipBonusBlock).to.equal(blockNumber);
  });
});
