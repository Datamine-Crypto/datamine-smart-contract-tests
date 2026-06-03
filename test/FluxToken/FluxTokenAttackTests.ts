import { expect } from 'chai';
import { deployFluxTokenAttackFixture } from '../helpers/fixtures/fluxToken';
import { parseUnits, mineBlocks, RevertMessages, lockTokens } from '../helpers/common';
import { loadFixture } from '../helpers/fixtureRunner';
import { getEthers } from '../helpers/getEthers';

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

			const ownerLockAmount = parseUnits('100');
			const attackerLockAmount = parseUnits('100');
			const burnAmount = parseUnits('0.1');

			// 1. Owner locks DAM to be the target of the burn. This sets up the state that the attacker will try to manipulate.
			await damToken.connect(owner).authorizeOperator(fluxToken.target);
			await fluxToken.connect(owner).lock(owner.address, ownerLockAmount);

			// 2. Attacker locks DAM to mint some FLUX. This is necessary for the attacker to acquire FLUX tokens,
			// which they will later use to trigger the re-entrancy attempt via `burnToAddress`.
			await damToken.connect(attackerAccount).authorizeOperator(fluxToken.target);
			await fluxToken.connect(attackerAccount).lock(attackerAccount.address, attackerLockAmount);

			// 3. Mine blocks and mint FLUX for the attacker. A large number of blocks are mined
			// to ensure the attacker has a sufficient amount of FLUX to perform the attack.
			const mintBlock = await mineBlocks(1000000);
			await fluxToken
				.connect(attackerAccount)
				.mintToAddress(attackerAccount.address, attackerAccount.address, mintBlock);
			const attackerFluxBalance = await fluxToken.balanceOf(attackerAccount.address);
			expect(attackerFluxBalance).to.be.gt(0);

			// 4. Attacker transfers FLUX to the attacker contract. This is a crucial step as it sets up
			// the re-entrancy entry point: the attacker contract will have the `tokensReceived` hook,
			// which will be triggered when `burnToAddress` attempts to transfer FLUX to it.
			await fluxToken.connect(attackerAccount).transfer(unlockAttacker.target, burnAmount);
			const attackerContractFluxBalance = await fluxToken.balanceOf(unlockAttacker.target);
			expect(attackerContractFluxBalance).to.equal(burnAmount);

			// 5. Set up the attack parameters within the `UnlockAttacker` contract.
			// This configures the attacker contract with the target (FluxToken), the victim (owner),
			// and the amount to attempt to burn during the re-entrant call.
			await unlockAttacker.setAttackParameters(fluxToken.target, owner.address, burnAmount);

			// 6. Get initial state of the owner's locked tokens and global burned amount.
			// This is done to capture the contract's state *before* the attack, allowing for
			// precise verification of changes after the attack attempt.
			const initialOwnerLock = await fluxToken.addressLocks(owner.address);
			const initialGlobalBurnedAmount = await fluxToken.globalBurnedAmount();

			// 7. Execute the attack. This is the critical step where the `UnlockAttacker` contract
			// calls `burnToAddress`, and its `tokensReceived` hook attempts to re-enter the `burnToAddress` function.
			await unlockAttacker.executeAttack();

			// 8. Check final state of the owner's locked tokens and global burned amount.
			const finalOwnerLock = await fluxToken.addressLocks(owner.address);
			const finalGlobalBurnedAmount = await fluxToken.globalBurnedAmount();

			// The burned amount for the owner should increase by exactly `burnAmount`, not more.
			// This assertion is the core of the test, verifying that the re-entrancy protection
			// on `burnToAddress` successfully prevented the attacker from burning tokens twice
			// or manipulating the state in an unintended way.
			expect(finalOwnerLock.burnedAmount).to.equal(initialOwnerLock.burnedAmount + burnAmount);
			expect(finalGlobalBurnedAmount).to.equal(initialGlobalBurnedAmount + burnAmount);
		});
	});

	describe('Direct validation and edge case checks', function () {
		it('Should revert if lock amount is 0', async function () {
			const { fluxToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await expect(
				fluxToken.connect(owner).lock(owner.address, 0)
			).to.be.revertedWith(RevertMessages.YOU_MUST_PROVIDE_A_POSITIVE_AMOUNT_TO_LOCK_IN);
		});

		it('Should revert if burn amount is 0', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await damToken.connect(owner).authorizeOperator(fluxToken.target);
			await fluxToken.connect(owner).lock(owner.address, parseUnits('100'));
			await expect(
				fluxToken.connect(owner).burnToAddress(owner.address, 0)
			).to.be.revertedWith('You must burn > 0 FLUX');
		});

		it('Should revert if trying to unlock without locked tokens', async function () {
			const { fluxToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await expect(
				fluxToken.connect(owner).unlock()
			).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS);
		});

		it('Should revert if burning to an unlocked address', async function () {
			const { fluxToken, damToken, owner, attackerAccount } = await loadFixture(deployFluxTokenAttackFixture);
			await damToken.connect(owner).authorizeOperator(fluxToken.target);
			await fluxToken.connect(owner).lock(owner.address, parseUnits('100'));

			const mintBlock = await mineBlocks(100);
			await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock);
			const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
			expect(ownerFluxBalance).to.be.gt(0);

			await expect(
				fluxToken.connect(owner).burnToAddress(attackerAccount.address, parseUnits('1'))
			).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS);
		});

		it('Should not allow double-minting in the same block by stepping block target', async function () {
			const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenAttackFixture);
			await damToken.connect(owner).authorizeOperator(fluxToken.target);
			await fluxToken.connect(owner).lock(owner.address, parseUnits('100'));

			// Advance blocks to accrue some mintable tokens.
			await mineBlocks(10);
			const currentBlock = await mineBlocks(0);

			const mintAmountUpToMinusOne = await fluxToken.getMintAmount(owner.address, currentBlock - 1);
			const mintAmountUpToCurrent = await fluxToken.getMintAmount(owner.address, currentBlock);

			const ethers = await getEthers();
			// Disable automine to execute transactions in the same block.
			await ethers.provider.send('evm_setAutomine', [false]);

			try {
				// Send first mint transaction up to currentBlock - 1
				const tx1 = await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock - 1);

				// Send second mint transaction up to currentBlock in the same block
				const tx2 = await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock, { gasLimit: 300000 });

				// Mine the block containing both transactions
				await ethers.provider.send('evm_mine', []);

				// Wait for both to complete
				await tx1.wait();
				await tx2.wait();

				// Verify total minted amount is exactly equal to the mintAmountUpToCurrent.
				// This confirms no double-minting occurred (i.e. we didn't get mintAmountUpToMinusOne + mintAmountUpToCurrent).
				const finalBalance = await fluxToken.balanceOf(owner.address);
				expect(finalBalance).to.equal(mintAmountUpToCurrent);

			} finally {
				// Re-enable automine
				await ethers.provider.send('evm_setAutomine', [true]);
			}
		});

		it('Should dilute other validators multipliers if an attacker locks 1 wei and burns a massive amount', async function () {
			const { fluxToken, damToken, owner, attackerAccount } = await loadFixture(deployFluxTokenAttackFixture);

			// 1. Owner (Honest Validator) locks 10 DAM
			await damToken.connect(owner).authorizeOperator(fluxToken.target);
			await fluxToken.connect(owner).lock(owner.address, parseUnits('10'));

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
			await damToken.connect(attackerAccount).authorizeOperator(fluxToken.target);
			await fluxToken.connect(attackerAccount).lock(attackerAccount.address, 1n);

			// Attacker burns their FLUX to dilute the global ratio
			await fluxToken.connect(attackerAccount).burnToAddress(attackerAccount.address, attackerFluxBalance);

			// 5. Verify Owner's multiplier has been suppressed back to near 1x (10099)
			const multiplierAfter = await fluxToken.getAddressBurnMultiplier(owner.address);
			expect(multiplierAfter).to.be.lt(10500n); // Has been significantly diluted from 2x (20000)
			expect(multiplierAfter).to.be.gt(10000n); // Still above base 1x
		});
	});
});
