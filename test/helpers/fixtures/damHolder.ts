import { deployLockquidityContracts, deployDamHolder } from '../deployHelpers';
import { deployBaseFixture } from './base';

export async function deployDamHolderFixture() {
  const { damToken, owner, addr1 } = await deployBaseFixture();
  const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
  const damHolder = await deployDamHolder();

  return { lockquidityFactory, lockquidityToken, owner, addrB: addr1, damToken, damHolder };
}
