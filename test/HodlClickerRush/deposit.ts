import { expect } from 'chai';
import { ethers } from 'hardhat';
import { setupHodlClickerRushTests, setupPlayerForHodlClicker, setupBurnableAddress, depositFor } from '../helpers';

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

  it('should allow depositing and calculate actualAmountToDeposit correctly when contract is empty', async () => {
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
      .withArgs(addr1.address, addr1FluxBalance, 10000, addr1FluxBalance, 0, 0, addr1FluxBalance);

    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.rewardsAmount).to.equal(addr1FluxBalance);
  });

  it('should calculate actualAmountToDeposit correctly when rewards have been added to the pool', async () => {
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
    const addr1FluxBalance = await setupPlayerForHodlClicker(
      hodlClickerRush,
      fluxToken,
      damToken,
      addr1,
      damAmount,
      addr1.address,
    );

    const expectedActualAmount = (addr1FluxBalance * totalContractLockedAmount) / totalContractRewardsAmount;

    await expect(hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 500, 0, 0))
      .to.emit(hodlClickerRush, 'Deposited')
      .withArgs(addr1.address, addr1FluxBalance, 500, expectedActualAmount, 0, 0, expectedActualAmount);

    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.rewardsAmount).to.equal(expectedActualAmount);
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
});
