import { ethers } from 'hardhat';
import { deployFluxToken } from '../deployHelpers';
import { lockTokens } from '../setupHelpers';
import { parseUnits } from '../common';
import { deployBaseFixture } from './base';

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
