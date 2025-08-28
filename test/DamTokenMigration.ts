import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { parseUnits, ZERO_ADDRESS, EventNames, EMPTY_BYTES, deployDamToken, testTokenBurn } from './helpers';

describe('DAM Token Migration Tests', function () {
  async function deployDamTokenFixture() {
    const [registryFunderAddress, creatorAddress, operatorAddress, otherAccount] = await ethers.getSigners();

    // Use creatorAddress to deploy the DamToken
    const damToken = await deployDamToken(creatorAddress);

    return { damToken, registryFunderAddress, creatorAddress, operatorAddress, otherAccount };
  }

  it('should ensure proper construction parameters with 25m premine', async function () {
    const { damToken } = await loadFixture(deployDamTokenFixture);

    expect(await damToken.name()).to.equal('Datamine');
    expect(await damToken.symbol()).to.equal('DAM');

    // Ensure the premine is as expected (25,000,000 * 10^18)
    const totalSupply = await damToken.totalSupply();
    const expectedSupply = parseUnits('25000000');
    expect(totalSupply).to.equal(expectedSupply);
  });

  it('should emit Minted and Transfer events on deployment', async function () {
    const { damToken, creatorAddress } = await loadFixture(deployDamTokenFixture);
    const expectedSupply = parseUnits('25000000');

    // Verify Minted event
    await expect(damToken.deploymentTransaction())
      .to.emit(damToken, EventNames.Minted)
      .withArgs(creatorAddress.address, creatorAddress.address, expectedSupply, EMPTY_BYTES, EMPTY_BYTES);

    // Verify Transfer event
    await expect(damToken.deploymentTransaction())
      .to.emit(damToken, EventNames.Transfer)
      .withArgs(ZERO_ADDRESS, creatorAddress.address, expectedSupply);
  });

  it('should ensure supply burns properly via operator', async function () {
    const { damToken, creatorAddress, operatorAddress } = await loadFixture(deployDamTokenFixture);
    const burnAmount = parseUnits('1000');
    await testTokenBurn(damToken, creatorAddress, operatorAddress, burnAmount);
  });
});
