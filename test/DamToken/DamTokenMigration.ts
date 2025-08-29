import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { parseUnits, ZERO_ADDRESS, EventNames, EMPTY_BYTES, deployDamToken, testTokenBurn } from '../helpers';

/**
 * @dev Test suite for verifying the correct deployment and initial state of the DamToken contract,
 * specifically focusing on its migration-related parameters and event emissions.
 */
describe('DAM Token Migration Tests', function () {
  /**
   * @dev Fixture to deploy a fresh DamToken contract for each test, using a specific creator address.
   * This setup ensures a consistent and isolated environment for migration-specific tests.
   */
  async function deployDamTokenFixture() {
    const [registryFunderAddress, creatorAddress, operatorAddress, otherAccount] = await ethers.getSigners();

    // Use creatorAddress to deploy the DamToken to simulate a specific deployment scenario.
    const damToken = await deployDamToken(creatorAddress);

    return { damToken, registryFunderAddress, creatorAddress, operatorAddress, otherAccount };
  }

  it('should ensure proper construction parameters with 25m premine', async function () {
    const { damToken } = await loadFixture(deployDamTokenFixture);

    // Verify the token's name and symbol to ensure correct initialization as per migration specifications.
    expect(await damToken.name()).to.equal('Datamine');
    expect(await damToken.symbol()).to.equal('DAM');

    // Ensure the premine (total supply) is as expected (25,000,000 * 10^18).
    // This is critical to confirm the initial token distribution aligns with the migration plan.
    const totalSupply = await damToken.totalSupply();
    const expectedSupply = parseUnits('25000000');
    expect(totalSupply).to.equal(expectedSupply);
  });

  it('should emit Minted and Transfer events on deployment', async function () {
    const { damToken, creatorAddress } = await loadFixture(deployDamTokenFixture);
    const expectedSupply = parseUnits('25000000');

    // Verify that the ERC777 Minted event is emitted upon deployment.
    // This confirms the initial minting operation is correctly recorded on-chain.
    await expect(damToken.deploymentTransaction())
      .to.emit(damToken, EventNames.Minted)
      .withArgs(creatorAddress.address, creatorAddress.address, expectedSupply, EMPTY_BYTES, EMPTY_BYTES);

    // Verify that the standard ERC20/ERC777 Transfer event is emitted from the zero address to the creator.
    // This signifies the initial distribution of the total supply from a non-existent address to the contract creator.
    await expect(damToken.deploymentTransaction())
      .to.emit(damToken, EventNames.Transfer)
      .withArgs(ZERO_ADDRESS, creatorAddress.address, expectedSupply);
  });

  it('should ensure supply burns properly via operator', async function () {
    const { damToken, creatorAddress, operatorAddress } = await loadFixture(deployDamTokenFixture);
    const burnAmount = parseUnits('1000');
    // This test validates the delegated burning functionality, ensuring that an authorized operator can correctly
    // burn DamTokens. This is crucial for flexible supply management post-migration, allowing for controlled
    // token reduction as per the ecosystem's design.
    await testTokenBurn(damToken, creatorAddress, operatorAddress, burnAmount);
  });
});
