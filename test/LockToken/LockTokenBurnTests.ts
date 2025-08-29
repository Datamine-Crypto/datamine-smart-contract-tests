import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployLockquidityContracts,
  lockTokens,
  mintLockTokens,
} from '../helpers';

describe('LockToken Burn', function () {
  async function deployLockTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
      damToken.target,
    );

    return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, otherAccount };
  }

  describe('burnToAddress', function () {
    let lockquidityToken: any, damToken: any, owner: any;

    beforeEach(async function () {
      ({ lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture));
      const lockAmount = ethers.parseUnits('100', 18);
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);
      await mintLockTokens(lockquidityToken, owner, owner.address, 1);
    });

    it('Should revert if a user tries to burn more tokens than they have', async function () {
      const burnAmount = (await lockquidityToken.balanceOf(owner.address)) + parseUnits('1');

      await expect(lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount)).to.be.revertedWith(
        RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE,
      );
    });
  });
});
