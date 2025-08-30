import { ethers } from 'hardhat';
import { deployDamToken } from '../deployHelpers';
import { deployBaseFixture } from './base';

export async function deployDamTokenFixture() {
  const { damToken, owner, addr1, addr2 } = await deployBaseFixture();
  return { damToken, owner, operatorAddress: addr1, otherAccount: addr2 };
}

export async function deployDamTokenMigrationFixture() {
  const [registryFunderAddress, creatorAddress, operatorAddress, otherAccount] = await ethers.getSigners();
  const damToken = await deployDamToken(creatorAddress);
  return { damToken, registryFunderAddress, creatorAddress, operatorAddress, otherAccount };
}
