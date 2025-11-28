import hre from 'hardhat';
import { deployDamToken } from '../deployHelpers.js';

// Base fixture for deploying DAM token and getting signers
export async function deployBaseFixture(connection: any) {
  const { ethers } = connection;
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  const damToken = await deployDamToken(ethers);
  return { damToken, owner, addr1, addr2, addr3, ethers };
}
