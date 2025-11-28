import { deployLockquidityToken, deployDamBlockingHolder } from '../deployHelpers';
import { deployBaseFixture } from './base';

export async function deployReentrancyTestFixture(connection: any) {
	const { damToken, owner, addr1, ethers } = await deployBaseFixture(connection);
	// Deploy LockquidityToken with failsafe disabled (failsafeBlock = 0) to allow testing specific re-entrancy conditions
	const lockquidityToken = await deployLockquidityToken(ethers, damToken.target, 5760, 161280, 0, owner.address);
	const damBlockingHolder = await deployDamBlockingHolder(ethers, lockquidityToken.target);

	return {
		lockquidityToken,
		owner,
		addrB: addr1,
		damToken,
		damBlockingHolder,
		ethers,
	};
}
