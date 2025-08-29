import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { parseUnits, deployDamToken, deployFluxToken, lockTokens } from '../helpers';

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

      // This test verifies the core functionality of locking DAM tokens within the FluxToken contract.
      // This is fundamental because Flux tokens are minted based on these locked DAM tokens, making the successful
      // and secure locking process crucial for the entire ecosystem's operation and the integrity of the token supply.
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Check if the tokens are correctly locked in the FluxToken contract's balance.
      const lockedBalance = await damToken.balanceOf(fluxToken.target);
      expect(lockedBalance).to.equal(lockAmount);
    });
  });
});
