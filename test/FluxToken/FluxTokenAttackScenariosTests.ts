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
  deployFluxTokenFixture,
} from '../helpers';

describe('FluxToken Attack Scenarios', function () {
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
      // This test simulates an attack where a user attempts to mint tokens for a past lock period after re-locking.
      // This is crucial to prevent double-dipping on rewards or manipulating the token supply by re-using historical
      // lock data, thereby ensuring the integrity and fairness of the minting process against time-based exploits.
      await expect(fluxToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1)).to.be.revertedWith(
        RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK,
      );
    });
  });
});
