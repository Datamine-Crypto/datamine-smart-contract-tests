import { expect } from 'chai';
import { ethers } from 'hardhat';
import { setupHodlClickerRushTests, setupBurnableAddress, depositFor } from '../helpers';

describe('HodlClickerRush Simple Burn', () => {
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

  it('should return InsufficientContractBalance if not enough FLUX is deposited', async () => {
    const damAmount = ethers.parseEther('1000000');
    await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);

    const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(addr1.address);

    expect(burnOperationResult.resultCode).to.equal(3);
  });

  it('should successfully burn tokens if enough FLUX is deposited', async () => {
    const damAmount = ethers.parseEther('1000000');

    await depositFor(hodlClickerRush, fluxToken, damToken, addr1, damAmount);
    await setupBurnableAddress(damToken, fluxToken, owner, addr2, damAmount, hodlClickerRush);

    const burnOperationResult = await hodlClickerRush.connect(owner).burnTokens.staticCall(addr2.address);

    expect(burnOperationResult.resultCode).to.equal(0);
  });
});
