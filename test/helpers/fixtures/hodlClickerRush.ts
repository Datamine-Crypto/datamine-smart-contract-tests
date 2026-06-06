import { deployFluxToken, deployHodlClickerRush } from '../setup/deployHelpers';
import { deployBaseFixture } from './base';

export async function hodlClickerRushFixture() {
	const { damToken, owner, addr1, addr2, addr3 } = await deployBaseFixture();

	const fluxToken = await deployFluxToken(damToken.target, 1, 1, 1);
	const hodlClickerRush = await deployHodlClickerRush(fluxToken.target);

	return {
		hodlClickerRush,
		fluxToken,
		damToken,
		owner,
		addr1,
		addr2,
		addr3,
	};
}
