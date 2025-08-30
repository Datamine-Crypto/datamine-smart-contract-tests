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

// Base fixture for deploying DAM token and getting signers
export async function deployBaseFixture() {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  const damToken = await deployDamToken();
  return { damToken, owner, addr1, addr2, addr3 };
}

export async function deployDamTokenFixture() {
  const { damToken, owner, addr1, addr2 } = await deployBaseFixture();
  return { damToken, owner, operatorAddress: addr1, otherAccount: addr2 };
}

export async function deployDamTokenMigrationFixture() {
  const [registryFunderAddress, creatorAddress, operatorAddress, otherAccount] = await ethers.getSigners();
  const damToken = await deployDamToken(creatorAddress);
  return { damToken, registryFunderAddress, creatorAddress, operatorAddress, otherAccount };
}

export async function deployFluxTokenFixture() {
  const { damToken, owner, addr1 } = await deployBaseFixture();
  const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);
  return { fluxToken, damToken, owner, otherAccount: addr1 };
}

export async function deployFluxTokenAndLockFixture() {
  const { fluxToken, damToken, owner, otherAccount } = await deployFluxTokenFixture();
  const lockAmount = parseUnits('100');
  await lockTokens(fluxToken, damToken, owner, lockAmount);
  return { fluxToken, damToken, owner, otherAccount, lockAmount };
}

export async function deployFluxTokenAttackFixture() {
  const { damToken, owner, addr1, addr2 } = await deployBaseFixture();

  // Deploy FluxToken with failsafe disabled (0) to simplify attack scenario setup.
  const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

  // Deploy the malicious UnlockAttacker contract, which is designed to attempt re-entrancy.
  const UnlockAttacker = await ethers.getContractFactory('UnlockAttacker');
  const unlockAttacker = await UnlockAttacker.deploy();

  // Transfer DAM to attackerAccount for locking, so the attacker has tokens to interact with FluxToken.
  await damToken.connect(owner).transfer(addr1.address, parseUnits('1000'));

  return { fluxToken, damToken, unlockAttacker, owner, attackerAccount: addr1, otherAccount: addr2 };
}

export async function deployFluxTokenMigrationFixture() {
  const { damToken, owner, addr1, addr2, addr3 } = await deployBaseFixture();

  // Deploy FluxToken with specific time bonus and failsafe parameters relevant for migration.
  const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 161280);

  // Transfer some DAM to the damHolder to have tokens available for locking tests.
  await damToken.connect(owner).transfer(addr1.address, parseUnits('1000'));

  return { damToken, fluxToken, owner, damHolder: addr1, fluxMintReceiver: addr2, operator: addr3 };
}

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

export async function deployDamHolderFixture() {
  const { damToken, owner, addr1 } = await deployBaseFixture();
  const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
  const damHolder = await deployDamHolder();

  return { lockquidityFactory, lockquidityToken, owner, addrB: addr1, damToken, damHolder };
}

export async function deployReentrancyTestFixture() {
  const { damToken, owner, addr1 } = await deployBaseFixture();
  // Deploy LockquidityToken with failsafe disabled (failsafeBlock = 0) to allow testing specific re-entrancy conditions
  const lockquidityToken = await deployLockquidityToken(damToken.target, 5760, 161280, 0, owner.address);
  const damBlockingHolder = await deployDamBlockingHolder(lockquidityToken.target);

  return { lockquidityToken, owner, addrB: addr1, damToken, damBlockingHolder };
}
