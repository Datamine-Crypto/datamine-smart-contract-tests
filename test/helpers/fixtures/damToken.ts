import { deployDamToken } from '../deployHelpers';
import { deployBaseFixture } from './base';

export async function deployDamTokenFixture(connection: any) {
	const { damToken, owner, addr1, addr2, ethers } = await deployBaseFixture(connection);
	return {
		damToken,
		owner,
		operatorAddress: addr1,
		otherAccount: addr2,
		ethers,
	};
}

export async function deployDamTokenMigrationFixture(connection: any) {
	const { ethers } = connection;
	const [registryFunderAddress, creatorAddress, operatorAddress, otherAccount] = await ethers.getSigners();
	const damToken = await deployDamToken(ethers, creatorAddress);
	return {
		damToken,
		registryFunderAddress,
		creatorAddress,
		operatorAddress,
		otherAccount,
		ethers,
	};
}
