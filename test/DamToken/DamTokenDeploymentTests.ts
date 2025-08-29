import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { parseUnits, ZERO_ADDRESS, deployDamToken } from '../helpers';

describe('DamToken Deployment', function () {
  async function deployDamTokenFixture() {
    const [owner, operatorAddress, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();

    return { damToken, owner, operatorAddress, otherAccount };
  }

  describe('Deployment', function () {
    it('Should have the correct name and symbol', async function () {
      const { damToken } = await loadFixture(deployDamTokenFixture);
      // Verify the token's identity to ensure it's correctly initialized as "Datamine" with symbol "DAM".
      expect(await damToken.name()).to.equal('Datamine');
      expect(await damToken.symbol()).to.equal('DAM');
    });

    it('Should assign the total supply of tokens to the owner', async function () {
      const { damToken, owner } = await loadFixture(deployDamTokenFixture);
      const ownerBalance = await damToken.balanceOf(owner.address);
      // This test confirms that the entire initial token supply is correctly allocated to the deployer (owner) upon
      // contract creation. This is fundamental for establishing the initial distribution and control of the token supply.
      expect(await damToken.totalSupply()).to.equal(ownerBalance);
    });

    it('Should have the correct initial supply', async function () {
      const { damToken } = await loadFixture(deployDamTokenFixture);
      const expectedSupply = parseUnits('25000000');
      // Verify that the total supply minted at deployment matches the expected fixed amount.
      expect(await damToken.totalSupply()).to.equal(expectedSupply);
    });
  });
});
