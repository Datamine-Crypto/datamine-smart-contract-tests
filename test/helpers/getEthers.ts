import { getHreConnection } from './getHreConnection';

export const getEthers = async () => {
	const connection = await getHreConnection();
	const { ethers } = connection as any;
	return ethers;
};
