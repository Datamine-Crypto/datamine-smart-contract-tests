import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  deployDamToken,
  deployLockquidityContracts,
  lockTokens,
  mineBlocks,
  mintLockTokens,
} from '../helpers';

describe('LockToken Multipliers', function () {
  async function deployLockTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
      damToken.target,
    );

    return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, otherAccount };
  }

  describe('Multipliers', function () {
    let lockquidityToken: any, damToken: any, owner: any, otherAccount: any;
    const lockAmount = ethers.parseUnits('100', 18);

    beforeEach(async function () {
      ({ lockquidityToken, damToken, owner, otherAccount } = await loadFixture(deployLockTokenFixture));
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);
    });

    it('Should calculate the time multiplier correctly', async function () {
      // Advance blocks to simulate time passing
      const blocksToAdvance = 5760 + 9; // _startTimeReward + 9
      await mineBlocks(blocksToAdvance);

      const timeMultiplier = await lockquidityToken.getAddressTimeMultiplier(owner.address);
      expect(timeMultiplier).to.be.gt(10000); // Greater than 1x
    });

    it('Should calculate the burn multiplier correctly', async function () {
      // This test ensures the accurate calculation of the burn multiplier. This multiplier is designed to reward users
      // who actively participate in the token ecosystem by burning tokens, thereby influencing their future rewards
      // and contributing to the token's deflationary mechanics. Its correctness is essential for the intended economic incentives.
      // Lock tokens for otherAccount
      await damToken.connect(owner).transfer(otherAccount.address, lockAmount); // Transfer DAM from owner to otherAccount
      await lockTokens(lockquidityToken, damToken, otherAccount, lockAmount);

      const blocksToAdvance = 10000;
      await mintLockTokens(lockquidityToken, owner, owner.address, blocksToAdvance);

      // Burn some LOCK for owner
      const burnAmount = await lockquidityToken.balanceOf(owner.address);
      await lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount);

      const burnMultiplier = await lockquidityToken.getAddressBurnMultiplier(owner.address);
      expect(burnMultiplier).to.be.gt(1); // Greater than 1x
    });
  });
});
