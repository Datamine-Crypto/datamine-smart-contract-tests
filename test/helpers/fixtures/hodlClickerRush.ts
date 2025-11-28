import { deployBaseFixture } from './base';

export async function hodlClickerRushFixture(connection: any) {
	const { damToken, owner, addr1, addr2, addr3, ethers } = await deployBaseFixture(connection);

	const FluxToken = await ethers.getContractFactory('FluxToken');
	const fluxToken = await FluxToken.deploy(damToken.target, 1, 1, 1);
	await fluxToken.waitForDeployment();

	const HodlClickerRush = await ethers.getContractFactory('HodlClickerRush');
	const hodlClickerRush = await HodlClickerRush.deploy(fluxToken.target);
	await hodlClickerRush.waitForDeployment();

	return {
		hodlClickerRush,
		fluxToken,
		damToken,
		owner,
		addr1,
		addr2,
		addr3,
		ethers,
	};
}
