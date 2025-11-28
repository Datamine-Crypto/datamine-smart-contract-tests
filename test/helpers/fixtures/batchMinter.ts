import { deployFluxToken } from '../deployHelpers';
import { ContractNames } from '../common';
import { deployBaseFixture } from './base';

export async function deployBatchMinterFixture(connection: any) {
	const { ethers } = connection;
	const { damToken, owner, addr1, addr2, addr3 } = await deployBaseFixture(connection);

	// Map signers to user roles expected by tests
	const user1 = addr1;
	const user2 = addr2;
	const user3 = addr3;

	const fluxToken = await deployFluxToken(ethers, damToken.target, 5760, 161280, 0);

	const BatchMinter = await ethers.getContractFactory(ContractNames.BatchMinter);
	const batchMinter = await BatchMinter.deploy(fluxToken.target);

	return {
		damToken,
		fluxToken,
		batchMinter,
		owner,
		user1,
		user2,
		user3,
		ethers,
	};
}
