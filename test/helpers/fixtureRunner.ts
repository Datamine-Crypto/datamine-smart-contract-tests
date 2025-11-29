import fs from 'fs';
import { getHreConnection } from './getHreConnection';
import { getEthers } from './getEthers';

// Map to store wrapped fixtures to preserve identity for loadFixture caching
const wrappedFixtures = new Map<any, () => Promise<any>>();

export const loadFixture = async (fixture: (connection: any) => Promise<any>) => {
	try {
		const connection = await getHreConnection();
		const ethers = await getEthers();
		const hardhatLoadFixture = (connection as any).networkHelpers?.loadFixture;

		if (!hardhatLoadFixture) {
			throw new Error('loadFixture not found on connection.networkHelpers');
		}

		if (!wrappedFixtures.has(fixture)) {
			// Create a named wrapper function to satisfy Hardhat's requirements
			const wrapper = async function () {
				return fixture(connection);
			};
			// Set the name of the wrapper to match the original fixture name
			Object.defineProperty(wrapper, 'name', {
				value: fixture.name || 'wrappedFixture',
			});
			wrappedFixtures.set(fixture, wrapper);
		}

		const matchingFixture = await hardhatLoadFixture(wrappedFixtures.get(fixture)!);
		return {
			...matchingFixture,
			ethers,
		};
	} catch (e) {
		console.error('Error in fixtureRunner:', e);
		fs.writeFileSync('fixture_error.txt', String(e));
		throw e;
	}
};
