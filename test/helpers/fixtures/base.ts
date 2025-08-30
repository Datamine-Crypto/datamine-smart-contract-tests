import { ethers } from 'hardhat';
import { deployDamToken } from '../deployHelpers';

// Base fixture for deploying DAM token and getting signers
export async function deployBaseFixture() {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  const damToken = await deployDamToken();
  return { damToken, owner, addr1, addr2, addr3 };
}
