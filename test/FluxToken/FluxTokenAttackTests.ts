import { expect } from 'chai';
import { deployFluxTokenAttackFixture } from '../helpers/fixtures/fluxToken';
import { mineBlocks, runInSameBlock } from '../helpers/core/blockchain';
import { parseUnits, lockTokens } from '../helpers/core/tokens';
import { RevertMessages } from '../helpers/core/constants';
import {
	testReentrancyOnBurn,
	testRevertBurnZeroAmount,
	testRevertBurnToUnlockedAddress,
} from '../helpers/commonTests/burnTests';
import { testRevertLockZeroAmount, testRevertUnlockWithoutLockedTokens } from '../helpers/commonTests/lockTests';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';

/**
 * @dev Test suite specifically designed to verify the FluxToken contract's resilience against
 * re-entrancy attacks, particularly focusing on the `burnToAddress` function.
 * It uses a dedicated attacker contract to simulate malicious re-entrant calls.
 */
describe('FluxToken - Attack Scenarios', function () {
	describe('Re-entrancy on burnToAddress', function () {
		it('Should prevent re-entrancy on burnToAddress and not burn twice', async function () {
			// This test rigorously simulates a re-entrancy attack on the `burnToAddress` function using a malicious
			// `UnlockAttacker` contract. Its primary purpose is to demonstrate that despite attempts at re-entry via
			// ERC777 hooks, the FluxToken contract's internal mechanisms (e.g., mutexes, state checks) successfully
			// prevent double-burning or any unintended state manipulation, thereby safeguarding the token's supply
			// integrity and preventing economic exploits.
			const { fluxToken, damToken, unlockAttacker, owner, attackerAccount } =
				await loadFixture(deployFluxTokenAttackFixture);
			const burnAmount = parseUnits('0.1');

			await testReentrancyOnBurn(fluxToken, damToken, unlockAttacker, owner, attackerAccount, burnAmount);
		});
	});

	describe('Direct validation and edge case checks', function () {
		it('Should revert if lock amount is 0', async function () {
			const { fluxToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await testRevertLockZeroAmount(fluxToken, owner);
		});

		it('Should revert if burn amount is 0', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await testRevertBurnZeroAmount(fluxToken, damToken, owner, RevertMessages.YOU_MUST_BURN_GREATER_THAN_ZERO_FLUX);
		});

		it('Should revert if trying to unlock without locked tokens', async function () {
			const { fluxToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await testRevertUnlockWithoutLockedTokens(
				fluxToken,
				owner,
				RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS
			);
		});

		it('Should revert if burning to an unlocked address', async function () {
			const { fluxToken, damToken, owner, attackerAccount } = await loadFixture(deployFluxTokenAttackFixture);
			await testRevertBurnToUnlockedAddress(
				fluxToken,
				damToken,
				owner,
				attackerAccount,
				RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS
			);
		});

		it('Should not allow double-minting in the same block by stepping block target', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await lockTokens(fluxToken, damToken, owner, parseUnits('100'));

			// Advance blocks to accrue some mintable tokens.
			await mineBlocks(10);
			const currentBlock = await mineBlocks(0);

			const mintAmountUpToMinusOne = await fluxToken.getMintAmount(owner.address, currentBlock - 1);
			const mintAmountUpToCurrent = await fluxToken.getMintAmount(owner.address, currentBlock);

			await runInSameBlock(async () => {
				// Send first mint transaction up to currentBlock - 1
				const tx1 = await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock - 1);

				// Send second mint transaction up to currentBlock in the same block
				const tx2 = await fluxToken
					.connect(owner)
					.mintToAddress(owner.address, owner.address, currentBlock, { gasLimit: 300000 });

				// Mine the block containing both transactions
				await mineBlocks(1);

				// Wait for both to complete
				await tx1.wait();
				await tx2.wait();

				// Verify total minted amount is exactly equal to the mintAmountUpToCurrent.
				// This confirms no double-minting occurred (i.e. we didn't get mintAmountUpToMinusOne + mintAmountUpToCurrent).
				const finalBalance = await fluxToken.balanceOf(owner.address);
				expect(finalBalance).to.equal(mintAmountUpToCurrent);
			});
		});

		it('Should dilute other validators multipliers if an attacker locks 1 wei and burns a massive amount', async function () {
			const { fluxToken, damToken, owner, attackerAccount } = await loadFixture(deployFluxTokenAttackFixture);

			// 1. Owner (Honest Validator) locks 10 DAM
			await lockTokens(fluxToken, damToken, owner, parseUnits('10'));

			// 2. Mine blocks and let Owner burn their accrued FLUX to get a 2x multiplier
			let currentBlock = await mineBlocks(10000);
			await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
			const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
			expect(ownerFluxBalance).to.be.gt(0);

			// Burn all of Owner's FLUX
			await fluxToken.connect(owner).burnToAddress(owner.address, ownerFluxBalance);

			// Verify Owner has a high multiplier (should be 2x / 20000)
			const multiplierBefore = await fluxToken.getAddressBurnMultiplier(owner.address);
			expect(multiplierBefore).to.equal(20000n);

			// 3. Owner unlocks and locks 1000 DAM to generate massive FLUX for the attacker
			await fluxToken.connect(owner).unlock();
			await fluxToken.connect(owner).lock(owner.address, parseUnits('1000'));

			currentBlock = await mineBlocks(10000);
			// Mint 0.1 FLUX directly to the attacker
			await fluxToken.connect(owner).mintToAddress(owner.address, attackerAccount.address, currentBlock);
			const attackerFluxBalance = await fluxToken.balanceOf(attackerAccount.address);
			expect(attackerFluxBalance).to.be.gt(0);

			// 4. Attacker locks 1 wei of DAM
			await damToken.connect(owner).transfer(attackerAccount.address, 1n);
			await lockTokens(fluxToken, damToken, attackerAccount, 1n);

			// Attacker burns their FLUX to dilute the global ratio
			await fluxToken.connect(attackerAccount).burnToAddress(attackerAccount.address, attackerFluxBalance);

			// 5. Verify Owner's multiplier has been suppressed back to near 1x (10099)
			const multiplierAfter = await fluxToken.getAddressBurnMultiplier(owner.address);
			expect(multiplierAfter).to.be.lt(10500n); // Has been significantly diluted from 2x (20000)
			expect(multiplierAfter).to.be.gt(10000n); // Still above base 1x
		});

		it('Should allow multiplier retroactivity / supercharging in the same block', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenAttackFixture);

			// 1. Owner locks 10 DAM
			await lockTokens(fluxToken, damToken, owner, parseUnits('10'));

			// 2. Mine blocks to accumulate rewards and get some initial FLUX to burn
			let currentBlock = await mineBlocks(1000);
			await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
			const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
			expect(ownerFluxBalance).to.be.gt(0);

			// 3. Mine 1000 blocks to accumulate a new period of mintable rewards
			currentBlock = await mineBlocks(1000);

			// Calculate the expected base mint amount at the current multiplier (without burning)
			const expectedAmountBase = await fluxToken.getMintAmount(owner.address, currentBlock);
			expect(expectedAmountBase).to.be.gt(0);

			await runInSameBlock(async () => {
				// Send burn transaction to increase the multiplier in the same block
				const burnTx = await fluxToken.connect(owner).burnToAddress(owner.address, ownerFluxBalance);

				// Send mint transaction in the same block
				const mintTx = await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);

				// Mine the block containing both transactions
				await mineBlocks(1);

				// Wait for both transactions to complete
				await burnTx.wait();
				await mintTx.wait();

				// Get the balance after minting
				const finalBalance = await fluxToken.balanceOf(owner.address);

				// The balance should be the newly minted amount (since we burned the previous balance)
				// Verify that the minted amount is significantly higher than the expected base amount
				// because the new burn multiplier applies retrospectively to the entire 1000 blocks.
				expect(finalBalance).to.be.gt(expectedAmountBase);
			});
		});

		it('Should revert if a locked attacker tries to mint from another users locked tokens (minter delegation theft)', async function () {
			const { fluxToken, damToken, owner, attackerAccount } = await loadFixture(deployFluxTokenAttackFixture);

			// 1. Owner (victim) locks 100 DAM with self as minter
			await lockTokens(fluxToken, damToken, owner, parseUnits('100'));

			// 2. Transfer DAM to attacker and have them lock too (attacker is also a validator)
			await damToken.connect(owner).transfer(attackerAccount.address, parseUnits('10'));
			await lockTokens(fluxToken, damToken, attackerAccount, parseUnits('10'));

			// 3. Mine blocks so both have accrued rewards
			const currentBlock = await mineBlocks(100);

			// 4. Attacker tries to mint from owner's (victim's) locked tokens to attacker's address.
			//    This should fail because the attacker is NOT the delegated minter for the owner's lock.
			await expect(
				fluxToken.connect(attackerAccount).mintToAddress(owner.address, attackerAccount.address, currentBlock)
			).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
		});

		it('Should revert if someone tries to send DAM directly to the FluxToken contract (bypassing lock)', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenAttackFixture);

			// An attacker tries to send DAM tokens directly to the FluxToken contract using ERC777 `send()`,
			// bypassing the `lock()` function. This could potentially disrupt the contract's internal
			// accounting if not properly guarded. The `tokensReceived` hook enforces that only the
			// FluxToken contract itself (as operator during lock) can receive DAM.
			const amountToSend = parseUnits('100');
			await expect(damToken.connect(owner).send(fluxToken.target, amountToSend, '0x')).to.be.revertedWith(
				RevertMessages.ONLY_FLUX_CONTRACT_CAN_SEND_ITSELF_DAM_TOKENS
			);
		});

		it('Should preserve burned amount across unlock/re-lock cycles (no free multiplier reset)', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenAttackFixture);

			// 1. Owner locks 100 DAM
			await lockTokens(fluxToken, damToken, owner, parseUnits('100'));

			// 2. Mine blocks and mint FLUX to burn
			const currentBlock = await mineBlocks(1000);
			await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
			const fluxBalance = await fluxToken.balanceOf(owner.address);
			expect(fluxBalance).to.be.gt(0);

			// 3. Burn FLUX to build up burnedAmount and increase multiplier
			await fluxToken.connect(owner).burnToAddress(owner.address, fluxBalance);

			// 4. Record the burned amount and multiplier
			const burnedAmountBeforeUnlock = (await fluxToken.addressLocks(owner.address)).burnedAmount;
			expect(burnedAmountBeforeUnlock).to.be.gt(0);
			const multiplierBeforeUnlock = await fluxToken.getAddressBurnMultiplier(owner.address);
			expect(multiplierBeforeUnlock).to.be.gt(10000n); // Above base 1x

			// 5. Unlock and re-lock (attacker hopes burnedAmount resets to 0 for a "fresh start")
			await fluxToken.connect(owner).unlock();
			await lockTokens(fluxToken, damToken, owner, parseUnits('100'));

			// 6. Verify burnedAmount persisted across the unlock/re-lock cycle.
			//    This is by design — the ecosystem rewards long-term participation.
			const burnedAmountAfterReLock = (await fluxToken.addressLocks(owner.address)).burnedAmount;
			expect(burnedAmountAfterReLock).to.equal(burnedAmountBeforeUnlock);

			// 7. Verify multiplier is preserved (will be the same since the same burned amount
			//    was re-added to globalBurnedAmount during lock())
			const multiplierAfterReLock = await fluxToken.getAddressBurnMultiplier(owner.address);
			expect(multiplierAfterReLock).to.equal(multiplierBeforeUnlock);
		});
	});
});
