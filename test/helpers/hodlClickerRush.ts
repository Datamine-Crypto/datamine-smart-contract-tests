import { hodlClickerRushFixture } from './fixtures/hodlClickerRush.js';
import { lockTokens, mineBlocks } from './common.js';

/**
 * @notice Deposits a specified amount of FLUX tokens into the HodlClickerRush contract for a user.
 * This function handles the necessary setup, including transferring DAM, locking it for FLUX,
 * and authorizing the HodlClickerRush contract as an operator for the user's FLUX tokens.
 * @param ethers The Hardhat ethers plugin instance.
 * @param hodlClickerRush The HodlClickerRush contract instance.
 * @param fluxToken The FluxToken contract instance.
 * @param damToken The DamToken contract instance.
 * @param user The signer/address representing the user.
 * @param amount The amount of DAM to process for deposit (will be converted to FLUX).
 * @returns The user's FLUX balance after setup.
 */
export async function depositFor(
	ethers: any,
	hodlClickerRush: any,
	fluxToken: any,
	damToken: any,
	user: any,
	amount: any
) {
	const userFluxBalance = await setupPlayerForHodlClickerRush(
		ethers,
		hodlClickerRush,
		fluxToken,
		damToken,
		user,
		amount,
		user.address
	);
	await hodlClickerRush.connect(user).deposit(userFluxBalance, 0, 0, 0);
	return userFluxBalance;
}

/**
 * @notice Sets up an address to be burnable by the HodlClickerRush contract.
 * This involves transferring DAM to the user, locking it to mint FLUX,
 * and setting the HodlClickerRush contract as the minter for the user's FLUX.
 * @param ethers The Hardhat ethers plugin instance.
 * @param damToken The DamToken contract instance.
 * @param fluxToken The FluxToken contract instance.
 * @param owner The owner/deployer signer (used for initial DAM transfer).
 * @param user The signer/address to set up as burnable.
 * @param amount The amount of DAM to transfer and lock.
 * @param hodlClickerRush The HodlClickerRush contract instance.
 */
export async function setupBurnableAddress(
	ethers: any,
	damToken: any,
	fluxToken: any,
	owner: any,
	user: any,
	amount: any,
	hodlClickerRush: any
) {
	await damToken.connect(owner).transfer(user.address, amount);
	await lockTokens(ethers, fluxToken, damToken, user, amount, hodlClickerRush.target);
	await mineBlocks(ethers, 1000);
}

/**
 * @notice Sets up a default scenario for HodlClickerRush tests.
 * This includes depositing tokens for the owner and setting up a burnable address.
 * @param ethers The Hardhat ethers plugin instance.
 * @param hodlClickerRush The HodlClickerRush contract instance.
 * @param fluxToken The FluxToken contract instance.
 * @param damToken The DamToken contract instance.
 * @param owner The owner/deployer signer.
 * @param user The user/address to set up as burnable.
 * @param amount The amount of DAM to use for setup.
 */
export async function setupDefaultScenario(
	ethers: any,
	hodlClickerRush: any,
	fluxToken: any,
	damToken: any,
	owner: any,
	user: any,
	amount: any
) {
	await depositFor(ethers, hodlClickerRush, fluxToken, damToken, owner, amount);
	await setupBurnableAddress(ethers, damToken, fluxToken, owner, user, amount, hodlClickerRush);
}

/**
 * @notice Sets up the HodlClickerRush test environment.
 * Deploys necessary contracts and provides common signers.
 * @returns An object containing contract instances and signers.
 */
export async function setupHodlClickerRushTests() {
	const fixture = await hodlClickerRushFixture();
	const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } = fixture as any;
	const signers = await ethers.getSigners();
	const addr3 = signers[3];
	const addr4 = signers[4];

	return {
		hodlClickerRush,
		fluxToken,
		damToken,
		owner,
		addr1,
		addr2,
		addr3,
		addr4,
		ethers,
	};
}

/**
 * @notice Sets up a player for HodlClickerRush by transferring DAM, locking it for FLUX,
 * mining blocks for minting, and authorizing the HodlClickerRush contract as an operator.
 * @param ethers The Hardhat ethers plugin instance.
 * @param hodlClickerRush The HodlClickerRush contract instance.
 * @param fluxToken The FluxToken contract instance.
 * @param damToken The DamToken contract instance.
 * @param user The signer/address representing the player.
 * @param damAmount The amount of DAM to transfer and lock.
 * @param minterAddress The address to be designated as the minter for the locked FLUX.
 * @returns The user's FLUX balance after setup.
 */
export async function setupPlayerForHodlClickerRush(
	ethers: any,
	hodlClickerRush: any,
	fluxToken: any,
	damToken: any,
	user: any,
	damAmount: any,
	minterAddress: any
) {
	const [owner] = await ethers.getSigners();
	await damToken.connect(owner).transfer(user.address, damAmount);
	await lockTokens(ethers, fluxToken, damToken, user, damAmount, minterAddress);
	await mineBlocks(ethers, 1000);
	const currentBlock = await ethers.provider.getBlockNumber();
	await fluxToken.connect(user).mintToAddress(user.address, user.address, currentBlock);
	const userFluxBalance = await fluxToken.balanceOf(user.address);
	await fluxToken.connect(user).authorizeOperator(hodlClickerRush.target);
	return userFluxBalance;
}
