import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployLockquidityContracts,
  lockTokens,
  mineBlocks,
  mintLockTokens,
} from './helpers';

describe('LockToken Attack Scenarios', function () {
  async function deployLockTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
      damToken.target,
    );

    return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, otherAccount };
  }

  describe('Attack Scenarios', function () {
    it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
      const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('100');

      // First lock
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Mint after 10 blocks
      const mintBlock1 = await mintLockTokens(lockquidityToken, owner, owner.address, 10);

      // Unlock
      await lockquidityToken.connect(owner).unlock();
      await mineBlocks(10);

      // Re-lock
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Try to mint again with the old mint block.
      // This should fail because the last mint block is now the re-lock block.
      await expect(
        lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1),
      ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);
    });
  });
});
