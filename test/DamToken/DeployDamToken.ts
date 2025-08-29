import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { parseUnits, deployDamToken } from '../helpers';

/**
 * @dev Test suite for verifying the successful deployment and initial state of the DamToken contract.
 * These tests ensure that the token is correctly initialized with its fundamental properties.
 */
describe('DamToken Deployment', function () {
  /**
   * @dev Fixture to deploy a fresh DamToken contract and retrieve signer accounts for each test.
   * This ensures a clean and isolated testing environment for deployment-specific assertions.
   */
  async function deployDamTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();

    return { damToken, owner, otherAccount };
  }

  it('Should deploy DamToken and assign total supply to owner', async function () {
    const { damToken, owner } = await loadFixture(deployDamTokenFixture);
    const ownerBalance = await damToken.balanceOf(owner.address);
    const totalSupply = await damToken.totalSupply();
    // Verify that upon deployment, the entire token supply is correctly assigned to the contract owner.
    // This confirms the initial distribution mechanism.
    expect(ownerBalance).to.equal(totalSupply);
  });

  it('Should have the correct name and symbol', async function () {
    const { damToken } = await loadFixture(deployDamTokenFixture);
    // Ensure the token's identifying properties (name and symbol) are correctly set during deployment.
    expect(await damToken.name()).to.equal('Datamine');
    expect(await damToken.symbol()).to.equal('DAM');
  });

  it('Should have the correct initial supply', async function () {
    const { damToken } = await loadFixture(deployDamTokenFixture);
    const expectedSupply = parseUnits('25000000');
    // Verify that the total supply of tokens minted at the time of deployment matches the expected initial amount.
    expect(await damToken.totalSupply()).to.equal(expectedSupply);
  });
});
