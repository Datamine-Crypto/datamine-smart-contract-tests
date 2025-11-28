import { expect } from 'chai';
import {
	mineBlocks,
	parseUnits,
	ContractNames,
	EventNames,
	RevertMessages,
	deployFluxTokenMigrationFixture,
	lockTokens,
	mintFluxTokens,
	loadFixture,
} from '../helpers/index.js';

/**
 * @dev Test suite for the FLUX Token migration and core functionalities.
 * These tests cover construction parameters, locking/unlocking DAM, failsafe mechanisms,
 * and various minting and burning scenarios to ensure the token behaves as intended within the ecosystem.
 */
describe('FLUX Token Migration Tests', function () {
	it('should ensure proper construction parameters with 0 premined coins', async () => {
		const { fluxToken } = await loadFixture(deployFluxTokenMigrationFixture);
		// Verify the token's name and symbol to ensure correct initialization.
		expect(await fluxToken.name()).to.equal('FLUX');
		expect(await fluxToken.symbol()).to.equal('FLUX');
		// Crucially, ensure that FluxToken starts with a total supply of 0.
		// This confirms its design as a token minted solely through locking DAM, not pre-mined.
		expect(await fluxToken.totalSupply()).to.equal(0);
	});

	it('ensure DAM holder can lock DAM in FLUX smart contract', async () => {
		const { damToken, fluxToken, damHolder, ethers } = await loadFixture(deployFluxTokenMigrationFixture);
		const lockInAmount = parseUnits('10');

		// Test the fundamental ability of a DAM holder to lock their DAM tokens within the FluxToken contract.
		// This is the prerequisite for minting FLUX.
		const blockAfterLock = await lockTokens(ethers, fluxToken, damToken, damHolder, lockInAmount);

		const lockInAmountForAddress = await fluxToken.addressLocks(damHolder.address);
		// Verify that the correct amount of DAM is recorded as locked for the address, and at the correct block number.
		expect(lockInAmountForAddress.amount).to.equal(lockInAmount);
		expect(lockInAmountForAddress.blockNumber).to.equal(blockAfterLock);
	});

	it('ensure after locking-in DAM into FLUX you can unlock 100% of DAM back', async () => {
		const { damToken, fluxToken, damHolder, ethers } = await loadFixture(deployFluxTokenMigrationFixture);
		const initialBalance = await damToken.balanceOf(damHolder.address);
		const lockInAmount = parseUnits('10');

		await lockTokens(ethers, fluxToken, damToken, damHolder, lockInAmount);

		// Verify that DAM tokens are correctly transferred to FluxToken upon locking.
		expect(await damToken.balanceOf(damHolder.address)).to.equal(initialBalance - lockInAmount);
		expect(await damToken.balanceOf(fluxToken.target)).to.equal(lockInAmount);

		// Test the unlock mechanism: ensure that the `Unlocked` event is emitted with correct arguments.
		// This confirms the reversibility of the locking process and the ability to retrieve DAM.
		await expect(fluxToken.connect(damHolder).unlock())
			.to.emit(fluxToken, EventNames.Unlocked)
			.withArgs(damHolder.address, lockInAmount, 0);

		// Verify that the DAM holder's balance is fully restored after unlocking.
		expect(await damToken.balanceOf(damHolder.address)).to.equal(initialBalance);
	});

	it('ensure failsafe works', async () => {
		const { damToken, owner, damHolder, ethers } = await loadFixture(deployFluxTokenMigrationFixture);
		const FluxToken = await ethers.getContractFactory(ContractNames.FluxToken);
		// Deploy a new FluxToken instance with a specific failsafe block for this test.
		const fluxTokenWithFailsafe = await FluxToken.deploy(damToken.target, 5760, 161280, 20);

		const lockInAmount = parseUnits('1000');
		const lockInAmountSafe = parseUnits('100');

		// Transfer DAM to holder to have funds to lock.
		await damToken.connect(owner).transfer(damHolder.address, lockInAmount);

		// Attempting to lock more than the failsafe limit should fail.
		// This test rigorously validates the FluxToken's failsafe mechanism, which is a critical security feature.
		// It ensures that the contract correctly limits the amount of DAM that can be locked during a specified period,
		// preventing large, sudden inflows that could destabilize the system or be part of an exploit. It also confirms
		// that the failsafe is temporary and lifts after its duration, balancing security with usability.
		await expect(lockTokens(ethers, fluxTokenWithFailsafe, damToken, damHolder, lockInAmount)).to.be.revertedWith(
			RevertMessages.YOU_CAN_ONLY_LOCK_IN_UP_TO_100_DAM_DURING_FAILSAFE
		);

		// Locking an amount within the failsafe limit should succeed, confirming the failsafe's boundary.
		await lockTokens(ethers, fluxTokenWithFailsafe, damToken, damHolder, lockInAmountSafe);
		await fluxTokenWithFailsafe.connect(damHolder).unlock();

		// After the failsafe period has passed, locking the full amount should succeed.
		// This confirms that the failsafe is time-bound and does not permanently restrict locking.
		await mineBlocks(ethers, 30);
		await lockTokens(ethers, fluxTokenWithFailsafe, damToken, damHolder, lockInAmount);
	});

	it('ensure FLUX can be minted after DAM lock-in to another address', async () => {
		const { damToken, fluxToken, damHolder, fluxMintReceiver, ethers } = await loadFixture(
			deployFluxTokenMigrationFixture
		);
		const lockInAmount = parseUnits('1');

		// Lock DAM tokens, but specify a different address (fluxMintReceiver) as the minter.
		// This tests the delegated minting functionality, allowing FLUX to be minted to an address
		// other than the one that locked the DAM, supporting flexible ecosystem participation.
		await lockTokens(ethers, fluxToken, damToken, damHolder, lockInAmount, fluxMintReceiver.address);

		const currentBlock = await ethers.provider.getBlockNumber();

		// Ensure we can't mint on the same block as the last mint (or lock).
		// This enforces the time-based progression of minting.
		await expect(
			fluxToken.connect(fluxMintReceiver).mintToAddress(damHolder.address, fluxMintReceiver.address, currentBlock)
		).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);

		// Calculate expected amount for the next block.
		const nextBlock = await mineBlocks(ethers, 1);
		const expectedMintAmount = await fluxToken.getMintAmount(damHolder.address, nextBlock);

		// Mint on that block and verify the receiver's balance.
		// This confirms that FLUX is correctly minted to the designated receiver.
		await fluxToken.connect(fluxMintReceiver).mintToAddress(damHolder.address, fluxMintReceiver.address, nextBlock);

		expect(await fluxToken.balanceOf(fluxMintReceiver.address)).to.equal(expectedMintAmount);
	});

	it('ensure FLUX can be target-burned', async () => {
		const { damToken, fluxToken, damHolder, fluxMintReceiver, ethers } = await loadFixture(
			deployFluxTokenMigrationFixture
		);
		const lockInAmount = parseUnits('10');

		await lockTokens(ethers, fluxToken, damToken, damHolder, lockInAmount);
		await mintFluxTokens(ethers, fluxToken, damHolder, damHolder.address, 1);

		// Transfer minted flux to the burner (fluxMintReceiver) to simulate a scenario where
		// a different address performs the target burn.
		const mintedBalance = await fluxToken.balanceOf(damHolder.address);
		await fluxToken.connect(damHolder).transfer(fluxMintReceiver.address, mintedBalance);

		const burnAmount = parseUnits('0.000000001');

		const lockDataBefore = await fluxToken.addressLocks(damHolder.address);
		expect(lockDataBefore.burnedAmount).to.equal(0);

		// Perform the first target burn.
		// This tests the ability to burn FLUX tokens against a specific locked address,
		// which is part of the token's deflationary and reward-boosting mechanics.
		await fluxToken.connect(fluxMintReceiver).burnToAddress(damHolder.address, burnAmount);
		const lockDataAfterFirstBurn = await fluxToken.addressLocks(damHolder.address);
		// Verify that the burned amount for the target address is correctly updated.
		expect(lockDataAfterFirstBurn.burnedAmount).to.equal(burnAmount);

		// Perform a second target burn to ensure cumulative burning works correctly.
		await fluxToken.connect(fluxMintReceiver).burnToAddress(damHolder.address, burnAmount);
		const lockDataAfterSecondBurn = await fluxToken.addressLocks(damHolder.address);
		// Verify that the burned amount is correctly accumulated.
		expect(lockDataAfterSecondBurn.burnedAmount).to.equal(burnAmount * 2n);
	});
});
