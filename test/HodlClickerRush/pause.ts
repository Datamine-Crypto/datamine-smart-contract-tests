import { expect } from 'chai';
import { ethers } from 'hardhat';
import { setupDefaultScenario, setupHodlClickerRushTests } from '../helpers';

describe('HodlClickerRush Pause', () => {
  let hodlClickerRush: any,
    owner: any,
    addr1: any,
    addr2: any,
    damToken: any,
    fluxToken: any,
    setupBurnableAddress: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
    owner = setup.owner;
    addr1 = setup.addr1;
    addr2 = setup.addr2;
    damToken = setup.damToken;
    fluxToken = setup.fluxToken;
  });

  it('should allow an address to pause itself', async () => {
    await hodlClickerRush.connect(addr1).setPaused(true);
    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.isPaused).to.be.true;
  });

  it('should allow an address to unpause itself', async () => {
    await hodlClickerRush.connect(addr1).setPaused(true);
    let addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.isPaused).to.be.true;

    await hodlClickerRush.connect(addr1).setPaused(false);
    addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.isPaused).to.be.false;
  });

  it('should prevent a paused address from burning tokens', async () => {
    const damAmount = ethers.parseEther('1000000');

    await setupDefaultScenario(hodlClickerRush, fluxToken, damToken, owner, addr1, damAmount);

    await hodlClickerRush.connect(addr1).setPaused(true);

    const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(addr1.address);
    expect(burnOperationResult.resultCode).to.equal(4); // ValidatorPaused
  });

  it('should allow an unpaused address to burn tokens', async () => {
    const damAmount = ethers.parseEther('1000000');

    await setupDefaultScenario(hodlClickerRush, fluxToken, damToken, owner, addr1, damAmount);

    await hodlClickerRush.connect(addr1).setPaused(false);

    const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(addr1.address);
    expect(burnOperationResult.resultCode).to.equal(0); // Success
  });

  it('should emit PausedChanged event', async () => {
    await expect(hodlClickerRush.connect(addr1).setPaused(true))
      .to.emit(hodlClickerRush, 'PausedChanged')
      .withArgs(addr1.address, true);

    await expect(hodlClickerRush.connect(addr1).setPaused(false))
      .to.emit(hodlClickerRush, 'PausedChanged')
      .withArgs(addr1.address, false);
  });
});
