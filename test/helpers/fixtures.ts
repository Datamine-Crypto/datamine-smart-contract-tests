import { ethers } from 'hardhat';
import {
  deployDamToken,
  deployFluxToken,
  deployLockquidityContracts,
  deployDamHolder,
  deployLockquidityToken,
  deployDamBlockingHolder,
} from './deployHelpers';

export async function deployDamTokenFixture() {
  const [owner, operatorAddress, otherAccount] = await ethers.getSigners();
  const damToken = await deployDamToken();
  return { damToken, owner, operatorAddress, otherAccount };
}

export async function deployDamTokenMigrationFixture() {
  const [registryFunderAddress, creatorAddress, operatorAddress, otherAccount] = await ethers.getSigners();
  const damToken = await deployDamToken(creatorAddress);
  return { damToken, registryFunderAddress, creatorAddress, operatorAddress, otherAccount };
}

export async function deployFluxTokenFixture() {
  const [owner, otherAccount] = await ethers.getSigners();
  const damToken = await deployDamToken();
  const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);
  return { fluxToken, damToken, owner, otherAccount };
}

export async function deployLockTokenFixture() {
  const [owner, addrB] = await ethers.getSigners();
  const damToken = await deployDamToken();
  const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(damToken.target);
  return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, addrB };
}

export async function deployDamHolderFixture() {
  const [owner, addrB] = await ethers.getSigners();

  const damToken = await deployDamToken();
  const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
  const damHolder = await deployDamHolder();

  return { lockquidityFactory, lockquidityToken, owner, addrB, damToken, damHolder };
}

export async function deployLockTokenFixtureNoFailsafe() {
  const [owner, addrB] = await ethers.getSigners();

  const damToken = await deployDamToken();
  // Deploy LockquidityToken with failsafe disabled (failsafeBlock = 0) to allow testing specific re-entrancy conditions
  const lockquidityToken = await deployLockquidityToken(damToken.target, 5760, 161280, 0, owner.address);
  const damBlockingHolder = await deployDamBlockingHolder(lockquidityToken.target);

  return { lockquidityToken, owner, addrB, damToken, damBlockingHolder };
}
