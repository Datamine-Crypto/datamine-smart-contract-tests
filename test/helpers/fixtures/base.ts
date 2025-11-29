import { deployDamToken } from '../deployHelpers';
import { getEthers } from '../getEthers';

// Base fixture for deploying DAM token and getting signers
export async function deployBaseFixture() {
	const ethers = await getEthers();
	const [owner, addr1, addr2, addr3] = await ethers.getSigners();
	const damToken = await deployDamToken(owner);
	return { damToken, owner, addr1, addr2, addr3, ethers };
}
