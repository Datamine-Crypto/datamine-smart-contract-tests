import { deployLockquidityContracts, deployDamHolder } from '../deployHelpers.js';
import { deployBaseFixture } from './base.js';

export async function deployDamHolderFixture(connection: any) {
  const { damToken, owner, addr1, ethers } = await deployBaseFixture(connection);
  const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(ethers, damToken.target);
  const damHolder = await deployDamHolder(ethers);

  return {
    lockquidityFactory,
    lockquidityToken,
    owner,
    addrB: addr1,
    damToken,
    damHolder,
    ethers,
  };
}
