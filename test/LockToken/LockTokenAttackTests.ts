import { expect } from 'chai';
import { RevertMessages } from '../helpers/core/constants';
import {
	testReentrancyOnBurn,
	testRevertBurnZeroAmount,
	testRevertBurnToUnlockedAddress,
} from '../helpers/commonTests/burnTests';
import { testRevertLockZeroAmount } from '../helpers/commonTests/lockTests';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';
import { deployLockTokenAttackFixture } from '../helpers/fixtures/lockToken';
import { mineBlocks, runInSameBlock } from '../helpers/core/blockchain';
import { parseUnits, lockTokens } from '../helpers/core/tokens';

describe('LockToken - Attack Scenarios', function () {
	describe('Re-entrancy on burnToAddress', function () {
		it('Should prevent re-entrancy on burnToAddress and not burn twice', async function () {
			const { lockquidityToken, damToken, unlockAttacker, owner, attackerAccount } =
				await loadFixture(deployLockTokenAttackFixture);
			const burnAmount = 100n;

			await testReentrancyOnBurn(lockquidityToken, damToken, unlockAttacker, owner, attackerAccount, burnAmount);
		});
	});

	describe('Direct validation checks', function () {
		it('Should revert if lock amount is 0', async function () {
			const { lockquidityToken, owner } = await loadFixture(deployLockTokenAttackFixture);
			await testRevertLockZeroAmount(lockquidityToken, owner);
		});

		it('Should revert if burn amount is 0', async function () {
			const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenAttackFixture);
			await testRevertBurnZeroAmount(
				lockquidityToken,
				damToken,
				owner,
				RevertMessages.YOU_MUST_BURN_GREATER_THAN_ZERO_LOCK
			);
		});

		it('Should revert if burning to an unlocked address', async function () {
			const { lockquidityToken, damToken, owner, otherAccount } = await loadFixture(deployLockTokenAttackFixture);
			await testRevertBurnToUnlockedAddress(
				lockquidityToken,
				damToken,
				owner,
				otherAccount,
				RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS
			);
		});
	});

	describe('Multiplier and minting attack vectors', function () {
		it('Should revert if a locked attacker tries to mint from another users locked tokens (minter delegation theft)', async function () {
			const { lockquidityToken, damToken, owner, attackerAccount, otherAccount } =
				await loadFixture(deployLockTokenAttackFixture);

			// 1. Owner (victim) locks 100 ArbiFLUX tokens with self as minter
			await lockTokens(lockquidityToken, damToken, owner, parseUnits('100'));

			// 2. Transfer DAM to attacker and have them lock too (attacker is also a validator)
			await damToken.connect(owner).transfer(attackerAccount.address, parseUnits('10'));
			await lockTokens(lockquidityToken, damToken, attackerAccount, parseUnits('10'));

			// 3. Mine blocks so both have accrued rewards
			const currentBlock = await mineBlocks(100);

			// 4. Attacker tries to mint from owner's (victim's) locked tokens to attacker's address.
			//    This should fail because the attacker is NOT the delegated minter for the owner's lock.
			await expect(
				lockquidityToken.connect(attackerAccount).mintToAddress(owner.address, attackerAccount.address, currentBlock)
			).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
		});

		it('Should dilute other validators multipliers if an attacker locks 1 wei and burns a massive amount', async function () {
			const { lockquidityToken, damToken, owner, attackerAccount } = await loadFixture(deployLockTokenAttackFixture);

			// 1. Owner (Honest Validator) locks 10 ArbiFLUX
			await lockTokens(lockquidityToken, damToken, owner, parseUnits('10'));

			// 2. Mine blocks and let Owner burn their accrued LOCK to get a 2x multiplier
			let currentBlock = await mineBlocks(10000);
			await lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
			const ownerLockBalance = await lockquidityToken.balanceOf(owner.address);
			expect(ownerLockBalance).to.be.gt(0);

			// Burn all of Owner's LOCK
			await lockquidityToken.connect(owner).burnToAddress(owner.address, ownerLockBalance);

			// Verify Owner has a high multiplier.
			// LockToken uses _percentBurnMultiplier=1 (unlike FluxToken's _percentMultiplier=10000),
			// so a sole validator gets myRatio/globalRatio * 10000 + 1 = 10001.
			const multiplierBefore = await lockquidityToken.getAddressBurnMultiplier(owner.address);
			expect(multiplierBefore).to.equal(10001n);

			// 3. Owner unlocks and locks 1000 DAM to generate massive LOCK for the attacker
			await lockquidityToken.connect(owner).unlock();
			await lockTokens(lockquidityToken, damToken, owner, parseUnits('1000'));

			currentBlock = await mineBlocks(10000);
			// Mint LOCK directly to the attacker
			await lockquidityToken.connect(owner).mintToAddress(owner.address, attackerAccount.address, currentBlock);
			const attackerLockBalance = await lockquidityToken.balanceOf(attackerAccount.address);
			expect(attackerLockBalance).to.be.gt(0);

			// 4. Attacker locks 1 wei of DAM
			await damToken.connect(owner).transfer(attackerAccount.address, 1n);
			await lockTokens(lockquidityToken, damToken, attackerAccount, 1n);

			// Attacker burns their LOCK to dilute the global ratio
			await lockquidityToken.connect(attackerAccount).burnToAddress(attackerAccount.address, attackerLockBalance);

			// 5. Verify Owner's multiplier has been suppressed after dilution.
			// The attacker's massive burn ratio inflates the global ratio,
			// which suppresses the owner's burn multiplier.
			const multiplierAfter = await lockquidityToken.getAddressBurnMultiplier(owner.address);
			expect(multiplierAfter).to.be.lt(multiplierBefore); // Multiplier was diluted
			expect(multiplierAfter).to.be.gte(1n); // At minimum _percentBurnMultiplier (1)
		});

		it('Should allow multiplier retroactivity / supercharging in the same block', async function () {
			const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenAttackFixture);

			// 1. Owner locks 10 ArbiFLUX
			await lockTokens(lockquidityToken, damToken, owner, parseUnits('10'));

			// 2. Mine blocks to accumulate rewards and get some initial LOCK to burn
			let currentBlock = await mineBlocks(1000);
			await lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
			const ownerLockBalance = await lockquidityToken.balanceOf(owner.address);
			expect(ownerLockBalance).to.be.gt(0);

			// 3. Mine 1000 blocks to accumulate a new period of mintable rewards
			currentBlock = await mineBlocks(1000);

			// Calculate the expected base mint amount at the current multiplier (without burning)
			const expectedAmountBase = await lockquidityToken.getMintAmount(owner.address, currentBlock);
			expect(expectedAmountBase).to.be.gt(0);

			await runInSameBlock(async () => {
				// Send burn transaction to increase the multiplier in the same block
				const burnTx = await lockquidityToken.connect(owner).burnToAddress(owner.address, ownerLockBalance);

				// Send mint transaction in the same block
				const mintTx = await lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);

				// Mine the block containing both transactions
				await mineBlocks(1);

				// Wait for both transactions to complete
				await burnTx.wait();
				await mintTx.wait();

				// Get the balance after minting
				const finalBalance = await lockquidityToken.balanceOf(owner.address);

				// The balance should be the newly minted amount (since we burned the previous balance)
				// Verify that the minted amount is significantly higher than the expected base amount
				// because the new burn multiplier applies retrospectively to the entire 1000 blocks.
				expect(finalBalance).to.be.gt(expectedAmountBase);
			});
		});

		it('Should not allow double-minting in the same block by stepping block target', async function () {
			const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenAttackFixture);
			await lockTokens(lockquidityToken, damToken, owner, parseUnits('100'));

			// Advance blocks to accrue some mintable tokens.
			await mineBlocks(10);
			const currentBlock = await mineBlocks(0);

			const mintAmountUpToMinusOne = await lockquidityToken.getMintAmount(owner.address, currentBlock - 1);
			const mintAmountUpToCurrent = await lockquidityToken.getMintAmount(owner.address, currentBlock);

			await runInSameBlock(async () => {
				// Send first mint transaction up to currentBlock - 1
				const tx1 = await lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock - 1);

				// Send second mint transaction up to currentBlock in the same block
				const tx2 = await lockquidityToken
					.connect(owner)
					.mintToAddress(owner.address, owner.address, currentBlock, { gasLimit: 300000 });

				// Mine the block containing both transactions
				await mineBlocks(1);

				// Wait for both to complete
				await tx1.wait();
				await tx2.wait();

				// Verify total minted amount is exactly equal to the mintAmountUpToCurrent.
				// This confirms no double-minting occurred (i.e. we didn't get mintAmountUpToMinusOne + mintAmountUpToCurrent).
				const finalBalance = await lockquidityToken.balanceOf(owner.address);
				expect(finalBalance).to.equal(mintAmountUpToCurrent);
			});
		});
	});
});
