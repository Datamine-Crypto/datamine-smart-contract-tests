import { deployLockquidityContracts } from '../deployHelpers';
import { lockTokens, parseUnits } from '../common';
import { mintLockTokens } from '../setupHelpers';
import { deployBaseFixture } from './base';

export async function deployLockTokenFixture() {
  const { damToken, owner, addr1 } = await deployBaseFixture();
  const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(damToken.target);
  return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, addrB: addr1 };
}

export async function deployLockTokenAndLockFixture() {
  const { lockquidityToken, damToken, owner, addrB } = await deployLockTokenFixture();
  const lockAmount = parseUnits('100');
  await lockTokens(lockquidityToken, damToken, owner, lockAmount);
  return { lockquidityToken, damToken, owner, addrB, lockAmount };
}

export async function deployLockTokenAndMintFixture() {
  const { lockquidityToken, damToken, owner, addrB } = await deployLockTokenAndLockFixture();
  await mintLockTokens(lockquidityToken, owner, owner.address, 1);
  return { lockquidityToken, damToken, owner, addrB };
}
