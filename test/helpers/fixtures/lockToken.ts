import { deployLockquidityContracts } from '../deployHelpers.js';
import { lockTokens, parseUnits } from '../common.js';
import { mintLockTokens } from '../setupHelpers.js';
import { deployBaseFixture } from './base.js';

export async function deployLockTokenFixture(connection: any) {
	const { damToken, owner, addr1, ethers } = await deployBaseFixture(connection);
	const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
		ethers,
		damToken.target
	);
	return {
		lockquidityFactory,
		lockquidityToken,
		lockquidityVault,
		damToken,
		owner,
		addrB: addr1,
		ethers,
	};
}

export async function deployLockTokenAndLockFixture(connection: any) {
	const { lockquidityToken, damToken, owner, addrB, ethers } = await deployLockTokenFixture(connection);
	const lockAmount = parseUnits('100');
	await lockTokens(ethers, lockquidityToken, damToken, owner, lockAmount);
	return { lockquidityToken, damToken, owner, addrB, lockAmount, ethers };
}

export async function deployLockTokenAndMintFixture(connection: any) {
	const { lockquidityToken, damToken, owner, addrB, ethers } = await deployLockTokenAndLockFixture(connection);
	await mintLockTokens(ethers, lockquidityToken, owner, owner.address, 1);
	return { lockquidityToken, damToken, owner, addrB, ethers };
}
