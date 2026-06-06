import { expect } from 'chai';
import { mineBlocks, runInSameBlock } from '../helpers/core/blockchain';
import { parseUnits, lockTokens } from '../helpers/core/tokens';
import { ContractNames, RevertMessages } from '../helpers/core/constants';
import {
	testRevertLockWhenAlreadyLocked,
	testLockAndUnlock,
	testFailsafeLifecycle,
} from '../helpers/commonTests/lockTests';
import { deployFluxTokenMigrationFixture } from '../helpers/fixtures/fluxToken';
import { mintTokens } from '../helpers/setup/setupHelpers';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';

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
		const { damToken, fluxToken, damHolder } = await loadFixture(deployFluxTokenMigrationFixture);
		const lockInAmount = parseUnits('10');

		// Test the fundamental ability of a DAM holder to lock their DAM tokens within the FluxToken contract.
		// This is the prerequisite for minting FLUX.
		const blockAfterLock = await lockTokens(fluxToken, damToken, damHolder, lockInAmount);

		const lockInAmountForAddress = await fluxToken.addressLocks(damHolder.address);
		// Verify that the correct amount of DAM is recorded as locked for the address, and at the correct block number.
		expect(lockInAmountForAddress.amount).to.equal(lockInAmount);
		expect(lockInAmountForAddress.blockNumber).to.equal(blockAfterLock);
	});

	it('ensure after locking-in DAM into FLUX you can unlock 100% of DAM back', async () => {
		const { damToken, fluxToken, damHolder } = await loadFixture(deployFluxTokenMigrationFixture);
		const lockInAmount = parseUnits('10');

		await testLockAndUnlock(fluxToken, damToken, damHolder, lockInAmount);
	});

	it('ensure failsafe works', async () => {
		const { damToken, owner, damHolder, ethers } = await loadFixture(deployFluxTokenMigrationFixture);

		await testFailsafeLifecycle(
			ethers,
			ContractNames.FluxToken,
			damToken,
			owner,
			damHolder,
			RevertMessages.YOU_CAN_ONLY_LOCK_IN_UP_TO_100_DAM_DURING_FAILSAFE,
			[damToken.target, 5760, 161280, 20]
		);
	});

	it('ensure FLUX can be minted after DAM lock-in to another address', async () => {
		const { damToken, fluxToken, damHolder, fluxMintReceiver, ethers } = await loadFixture(
			deployFluxTokenMigrationFixture
		);
		const lockInAmount = parseUnits('1');

		// Lock DAM tokens, but specify a different address (fluxMintReceiver) as the minter.
		// This tests the delegated minting functionality, allowing FLUX to be minted to an address
		// other than the one that locked the DAM, supporting flexible ecosystem participation.
		await lockTokens(fluxToken, damToken, damHolder, lockInAmount, fluxMintReceiver.address);

		const currentBlock = await ethers.provider.getBlockNumber();

		// Ensure we can't mint on the same block as the last mint (or lock).
		// This enforces the time-based progression of minting.
		await expect(
			fluxToken.connect(fluxMintReceiver).mintToAddress(damHolder.address, fluxMintReceiver.address, currentBlock)
		).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);

		// Calculate expected amount for the next block.
		const nextBlock = await mineBlocks(1);
		const expectedMintAmount = await fluxToken.getMintAmount(damHolder.address, nextBlock);

		// Mint on that block and verify the receiver's balance.
		// This confirms that FLUX is correctly minted to the designated receiver.
		await fluxToken.connect(fluxMintReceiver).mintToAddress(damHolder.address, fluxMintReceiver.address, nextBlock);

		expect(await fluxToken.balanceOf(fluxMintReceiver.address)).to.equal(expectedMintAmount);
	});

	it('ensure FLUX can be target-burned', async () => {
		const { damToken, fluxToken, damHolder, fluxMintReceiver } = await loadFixture(deployFluxTokenMigrationFixture);
		const lockInAmount = parseUnits('10');

		await lockTokens(fluxToken, damToken, damHolder, lockInAmount);
		await mintTokens(fluxToken, damHolder, damHolder.address, 1);

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

	it('should not be possible to lock and unlock/lock in the same block', async () => {
		const { fluxToken, damToken, damHolder } = await loadFixture(deployFluxTokenMigrationFixture);
		const lockInAmount = parseUnits('10');

		await damToken.connect(damHolder).authorizeOperator(fluxToken.target);

		await runInSameBlock(async () => {
			// Send lock transaction
			const tx1 = await fluxToken.connect(damHolder).lock(damHolder.address, lockInAmount);

			// Attempt to send unlock transaction in the same block
			// Specifying gasLimit prevents Hardhat from simulating/estimating gas on broadcast which would throw immediately
			const tx2 = await fluxToken.connect(damHolder).unlock({ gasLimit: 300000 });

			// Mine the block containing these transactions
			await mineBlocks(1);

			// Expect the second transaction (unlock) to revert because it was executed in the same block
			try {
				await tx2.wait();
				expect.fail('Transaction should have reverted');
			} catch (error: any) {
				expect(error.message).to.include('transaction execution reverted');
			}
		});
	});

	it('should revert when attempting to lock tokens when already locked', async () => {
		const { fluxToken, damToken, damHolder } = await loadFixture(deployFluxTokenMigrationFixture);
		const lockInAmount = parseUnits('10');

		await testRevertLockWhenAlreadyLocked(
			fluxToken,
			damToken,
			damHolder,
			lockInAmount,
			RevertMessages.YOU_MUST_HAVE_UNLOCKED_YOUR_DAM_TOKENS
		);
	});
});
