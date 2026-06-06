import { deployFluxToken, deployBatchMinter } from '../setup/deployHelpers';
import { deployBaseFixture } from './base';

export async function deployBatchMinterFixture() {
	const { damToken, owner, addr1, addr2, addr3 } = await deployBaseFixture();

	// Map signers to user roles expected by tests
	const user1 = addr1;
	const user2 = addr2;
	const user3 = addr3;

	const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);
	const batchMinter = await deployBatchMinter(fluxToken.target);

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
