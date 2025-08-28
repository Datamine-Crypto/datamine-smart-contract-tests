import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { parseUnits, deployDamToken } from './helpers';

describe('DamToken Deployment', function () {
  async function deployDamTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();

    return { damToken, owner, otherAccount };
  }

  it('Should deploy DamToken and assign total supply to owner', async function () {
    const { damToken, owner } = await loadFixture(deployDamTokenFixture);
    const ownerBalance = await damToken.balanceOf(owner.address);
    const totalSupply = await damToken.totalSupply();
    expect(ownerBalance).to.equal(totalSupply);
  });

  it('Should have the correct name and symbol', async function () {
    const { damToken } = await loadFixture(deployDamTokenFixture);
    expect(await damToken.name()).to.equal('Datamine');
    expect(await damToken.symbol()).to.equal('DAM');
  });

  it('Should have the correct initial supply', async function () {
    const { damToken } = await loadFixture(deployDamTokenFixture);
    const expectedSupply = parseUnits('25000000');
    expect(await damToken.totalSupply()).to.equal(expectedSupply);
  });
});
