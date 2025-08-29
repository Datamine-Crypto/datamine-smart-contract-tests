import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  deployDamToken,
  deployFluxToken,
  lockTokens,
} from './helpers';

describe('FluxToken Deployment', function () {
  async function deployFluxTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    // Deploy FluxToken with specific parameters for time bonus and failsafe.
    const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

    return { fluxToken, damToken, owner, otherAccount };
  }

  describe('Deployment', function () {
    it('Should lock DAM tokens', async function () {
      const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
      const lockAmount = parseUnits('1');

      // Perform the lock operation to test the contract's ability to receive and hold DAM tokens.
      // This is fundamental for the FluxToken's operation as it mints based on locked DAM.
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Check if the tokens are correctly locked in the FluxToken contract's balance.
      const lockedBalance = await damToken.balanceOf(fluxToken.target);
      expect(lockedBalance).to.equal(lockAmount);
    });
  });
});
