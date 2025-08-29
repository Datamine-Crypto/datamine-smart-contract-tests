import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployFluxToken,
  lockTokens,
  mineBlocks,
  mintFluxTokens,
} from '../helpers';

describe('FluxToken Attack Scenarios', function () {
  async function deployFluxTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    // Deploy FluxToken with specific parameters for time bonus and failsafe.
    const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

    return { fluxToken, damToken, owner, otherAccount };
  }

  describe('Attack Scenarios', function () {
    it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
      const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
      const lockAmount = parseUnits('100');

      // First lock to establish an initial state.
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Mint after some blocks to record a lastMintBlockNumber.
      const mintBlock1 = await mintFluxTokens(fluxToken, owner, owner.address, 10);

      // Unlock and then re-lock to simulate a user re-engaging with the system.
      await fluxToken.connect(owner).unlock();
      await mineBlocks(10);
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Attempt to mint again using the *old* mint block number (mintBlock1).
      // This test is crucial to prevent double-minting or exploiting past lock periods
      // after a user has unlocked and re-locked tokens. It ensures the integrity of the
      // minting mechanism against time-based manipulation.
      await expect(fluxToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1)).to.be.revertedWith(
        RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK,
      );
    });
  });
});
