import { deployFluxToken } from '../deployHelpers';
import { ContractNames } from '../common';
import { deployBaseFixture } from './base';
import { getEthers } from '../getEthers';

export async function deployBatchMinterFixture() {
	const ethers = await getEthers();
	const { damToken, owner, addr1, addr2, addr3 } = await deployBaseFixture();

	// Map signers to user roles expected by tests
	const user1 = addr1;
	const user2 = addr2;
	const user3 = addr3;

	const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

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
	};
}
