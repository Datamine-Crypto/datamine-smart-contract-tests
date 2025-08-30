import { ethers } from 'hardhat';
import {
  deployDamToken,
  deployFluxToken,
  deployLockquidityContracts,
  deployDamHolder,
  deployLockquidityToken,
  deployDamBlockingHolder,
} from './deployHelpers';
import { lockTokens, mintLockTokens } from './setupHelpers';
import { parseUnits } from './common';

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

export async function deployFluxTokenAndLockFixture() {
  const { fluxToken, damToken, owner, otherAccount } = await deployFluxTokenFixture();
  const lockAmount = parseUnits('100');
  await lockTokens(fluxToken, damToken, owner, lockAmount);
  return { fluxToken, damToken, owner, otherAccount, lockAmount };
}

export async function deployFluxTokenAttackFixture() {
  const [owner, attackerAccount, otherAccount] = await ethers.getSigners();

  const damToken = await deployDamToken();
  // Deploy FluxToken with failsafe disabled (0) to simplify attack scenario setup.
  const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

  // Deploy the malicious UnlockAttacker contract, which is designed to attempt re-entrancy.
  const UnlockAttacker = await ethers.getContractFactory('UnlockAttacker');
  const unlockAttacker = await UnlockAttacker.deploy();

  // Transfer DAM to attackerAccount for locking, so the attacker has tokens to interact with FluxToken.
  await damToken.connect(owner).transfer(attackerAccount.address, parseUnits('1000'));

  return { fluxToken, damToken, unlockAttacker, owner, attackerAccount, otherAccount };
}

export async function deployFluxTokenMigrationFixture() {
  const [owner, damHolder, fluxMintReceiver, operator] = await ethers.getSigners();

  const damToken = await deployDamToken();
  // Deploy FluxToken with specific time bonus and failsafe parameters relevant for migration.
  const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 161280);

  // Transfer some DAM to the damHolder to have tokens available for locking tests.
  await damToken.connect(owner).transfer(damHolder.address, parseUnits('1000'));

  return { damToken, fluxToken, owner, damHolder, fluxMintReceiver, operator };
}

export async function deployLockTokenFixture() {
  const [owner, addrB] = await ethers.getSigners();
  const damToken = await deployDamToken();
  const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(damToken.target);
  return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, addrB };
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
