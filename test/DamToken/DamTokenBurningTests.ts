import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  deployDamToken,
  testTokenBurn,
} from '../helpers';

describe('DamToken Burning', function () {
  async function deployDamTokenFixture() {
    const [owner, operatorAddress, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();

    return { damToken, owner, operatorAddress, otherAccount };
  }

  describe('Burning', function () {
    it('should ensure supply burns properly via operator', async function () {
      const { damToken, owner, operatorAddress } = await loadFixture(deployDamTokenFixture);
      const burnAmount = parseUnits('1000');
      // Test delegated burning: ensure an authorized operator can successfully burn tokens on behalf of the owner.
      // This is a key ERC777 feature for flexible token management and delegated operations.
      await testTokenBurn(damToken, owner, operatorAddress, burnAmount);
    });
  });
});
