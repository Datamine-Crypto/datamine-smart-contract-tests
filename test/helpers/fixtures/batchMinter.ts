import { ethers } from 'hardhat';
import { deployDamToken, deployFluxToken } from '../deployHelpers';
import { ContractNames } from '../common';

export async function deployBatchMinterFixture() {
  const [owner, user1] = await ethers.getSigners();
  const damToken = await deployDamToken();
  const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);
  const BatchMinter = await ethers.getContractFactory(ContractNames.BatchMinter);
  const batchMinter = await BatchMinter.deploy(fluxToken.target);

  return { damToken, fluxToken, batchMinter, owner, user1 };
}
