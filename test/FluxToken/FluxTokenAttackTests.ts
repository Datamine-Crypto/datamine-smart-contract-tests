import { expect } from 'chai';
import { deployFluxTokenAttackFixture, loadFixture, parseUnits, mineBlocks } from '../helpers/index';

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
});
