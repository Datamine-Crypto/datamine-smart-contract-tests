import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  RevertMessages,
  deployLockTokenAndMintFixture,
} from '../helpers';

describe('LockToken Burn', function () {
  describe('burnToAddress', function () {
    it('Should revert if a user tries to burn more tokens than they have', async function () {
      const { lockquidityToken, owner } = await loadFixture(deployLockTokenAndMintFixture);
      // This test is critical for enforcing token supply integrity and preventing malicious burning.
      // It ensures that users cannot burn more LOCK tokens than they currently possess, which is a fundamental
      // security measure to prevent negative balances, unauthorized token destruction, and manipulation of the token supply.
      const burnAmount = (await lockquidityToken.balanceOf(owner.address)) + parseUnits('1');

      await expect(lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount)).to.be.revertedWith(
        RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE,
      );
    });
  });
});
