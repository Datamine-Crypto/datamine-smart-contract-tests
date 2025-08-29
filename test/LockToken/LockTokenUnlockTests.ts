import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployLockquidityContracts,
  lockTokens,
} from '../helpers';

describe('LockToken Unlock', function () {
  async function deployLockTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
      damToken.target,
    );

    return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, otherAccount };
  }

  describe('Unlock', function () {
    it('Should allow a user to unlock their tokens', async function () {
      const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
      const lockAmount = ethers.parseUnits('100', 18);

      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Unlock tokens
      await lockquidityToken.connect(owner).unlock();

      // Verify that the user's DAM token balance is restored
      expect(await damToken.balanceOf(owner.address)).to.equal(parseUnits('25000000')); // Initial balance
    });

    it('Should revert if a user tries to unlock without having locked tokens', async function () {
      const { lockquidityToken, owner } = await loadFixture(deployLockTokenFixture);

      await expect(lockquidityToken.connect(owner).unlock()).to.be.revertedWith(
        RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS,
      );
    });
  });
});
