import hre from 'hardhat';
import fs from 'fs';

// Map to store wrapped fixtures to preserve identity for loadFixture caching
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrappedFixtures = new Map<any, () => Promise<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loadFixture = async (fixture: (connection: any) => Promise<any>) => {
  try {
    const connection = await hre.network.connect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return hardhatLoadFixture(wrappedFixtures.get(fixture)!);
  } catch (e) {
    console.error('Error in fixtureRunner:', e);
    fs.writeFileSync('fixture_error.txt', String(e));
    throw e;
  }
};
