import hre from 'hardhat';
import fs from 'fs';

// Map to store wrapped fixtures to preserve identity for loadFixture caching
const wrappedFixtures = new Map<any, () => Promise<any>>();

// Store a single connection to the network to avoid creating multiple connections (otherwise IERC1820 hook fires multiple times)
let hreConnection: any = null;
const getConnection = async () => {
	if (hreConnection) {
		return hreConnection;
	}

	hreConnection = await hre.network.connect();
	return hreConnection;
};

export const loadFixture = async (fixture: (connection: any) => Promise<any>) => {
	try {
		const connection = await getConnection();
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
		return hardhatLoadFixture(wrappedFixtures.get(fixture)!);
	} catch (e) {
		console.error('Error in fixtureRunner:', e);
		fs.writeFileSync('fixture_error.txt', String(e));
		throw e;
	}
};
