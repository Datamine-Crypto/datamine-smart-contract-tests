import {
	deployLockquidityContracts,
	deployLockquidityToken,
	deployUnlockAttackerAndTransferDAM,
} from '../setup/deployHelpers';
import { lockTokens, parseUnits } from '../core/tokens';
import { mintTokens } from '../setup/setupHelpers';
import { deployBaseFixture } from './base';

export async function deployLockTokenFixture() {
	const { damToken, owner, addr1 } = await deployBaseFixture();
	const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(damToken.target);
	return {
		lockquidityFactory,
		lockquidityToken,
		lockquidityVault,
		damToken,
		owner,
		addrB: addr1,
	};
}

export async function deployLockTokenAndLockFixture() {
	const { lockquidityToken, lockquidityVault, damToken, owner, addrB } = await deployLockTokenFixture();
	const lockAmount = parseUnits('100');
	await lockTokens(lockquidityToken, damToken, owner, lockAmount);
	return { lockquidityToken, lockquidityVault, damToken, owner, addrB, lockAmount };
}

export async function deployLockTokenAndMintFixture() {
	const { lockquidityToken, lockquidityVault, damToken, owner, addrB } = await deployLockTokenAndLockFixture();
	await mintTokens(lockquidityToken, owner, owner.address, 1);
	return { lockquidityToken, lockquidityVault, damToken, owner, addrB };
}

export async function deployLockTokenAttackFixture() {
	const { damToken, owner, addr1, addr2 } = await deployBaseFixture();

	// Deploy LockquidityToken with failsafe target block set to 0.
	const lockquidityToken = await deployLockquidityToken(damToken.target, 5760, 161280, 0, owner.address);

	// Deploy malicious attacker contract and transfer DAM
	const unlockAttacker = await deployUnlockAttackerAndTransferDAM(damToken, owner, addr1.address, parseUnits('1000'));

	return {
		lockquidityToken,
		damToken,
		unlockAttacker,
		owner,
		attackerAccount: addr1,
		otherAccount: addr2,
	};
}
