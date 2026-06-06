import hre from 'hardhat';

// Store a single connection to the network to avoid creating multiple connections (otherwise IERC1820 hook fires multiple times)
let hreConnection: any = null;
export const getHreConnection = async () => {
	if (hreConnection) {
		return hreConnection;
	}

	hreConnection = await hre.network.connect();
	return hreConnection;
};
