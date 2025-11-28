import { expect } from 'chai';
import {
	hodlClickerRushFixture,
	depositFor,
	setupBurnableAddress,
	BurnResultCode,
	loadFixture,
} from '../helpers/index';

describe('HodlClickerRush Burn Edge Cases', () => {
	/**
	 * @dev Tests the scenario where no FLUX is available to mint for the target address.
	 * Expects BurnResultCode.NothingToMint.
	 */
	it('should return NothingToMint if no FLUX is available to mint', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		// Setup addr1 as a burnable address, but don't let enough blocks pass for minting
		await damToken.connect(owner).transfer(addr1.address, damAmount);
		await damToken.connect(addr1).authorizeOperator(fluxToken.target); // Authorize fluxToken to spend damToken
		await fluxToken.connect(addr1).lock(hodlClickerRush.target, damAmount);
		// Do NOT mine blocks, so getMintAmount will be 0

		const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(0, addr1.address);
		expect(burnOperationResult.resultCode).to.equal(BurnResultCode.NothingToMint);
	});

	/**
	 * @dev Tests the scenario where the current block number is less than the validator's minimum block number.
	 * Expects BurnResultCode.ValidatorMinBlockNotMet.
	 */
	it('should return ValidatorMinBlockNotMet if current block is less than minBlockNumber', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		await depositFor(ethers, hodlClickerRush, fluxToken, damToken, owner, damAmount);
		await setupBurnableAddress(ethers, damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);

		const currentBlock = await ethers.provider.getBlockNumber();
		const minBlockNumber = currentBlock + 100; // Set minBlockNumber in the future

		await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
		await hodlClickerRush.connect(addr1).deposit(0, 500, minBlockNumber, 0); // Update minBlockNumber

		const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(0, addr1.address);
		expect(burnOperationResult.resultCode).to.equal(BurnResultCode.ValidatorMinBlockNotMet);
	});

	/**
	 * @dev Tests the scenario where the actual burn amount is less than the validator's minimum burn amount.
	 * Expects BurnResultCode.ValidatorMinBurnAmountNotMet.
	 */
	it('should return ValidatorMinBurnAmountNotMet if actual burn amount is less than minBurnAmount', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('1000000');
		await depositFor(ethers, hodlClickerRush, fluxToken, damToken, owner, damAmount);
		await setupBurnableAddress(ethers, damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);

		const minBurnAmount = ethers.parseEther('1000000'); // Set a very high minBurnAmount

		await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
		await hodlClickerRush.connect(addr1).deposit(0, 500, 0, minBurnAmount); // Update minBurnAmount

		const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(0, addr1.address);
		expect(burnOperationResult.resultCode).to.equal(BurnResultCode.ValidatorMinBurnAmountNotMet);
	});
});
