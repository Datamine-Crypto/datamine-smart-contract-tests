import { expect } from 'chai';
import { ZERO_ADDRESS, EMPTY_BYTES, EventNames } from '../core/constants';
import { lockTokens, parseUnits } from '../core/tokens';
import { mineBlocks } from '../core/blockchain';

/**
 * A generic helper to test the `operatorBurn` functionality of the DAM token.
 * This helper is crucial because it encapsulates the full lifecycle of a delegated burn operation,
 * ensuring that all state changes and emitted events are correctly asserted.
 * It promotes consistent and thorough testing of a key ERC777 feature.
 * @param damToken The DAM token contract instance.
 * @param owner The owner of the tokens.
 * @param operator The operator account that will perform the burn.
 * @param burnAmount The amount of tokens to burn.
 */
export async function testTokenBurn(damToken: any, owner: any, operator: any, burnAmount: any) {
	// Authorize operator: This step is necessary to grant the `operator` account
	// the permission to burn tokens on behalf of the `owner`, as per ERC777 standards.
	await damToken.connect(owner).authorizeOperator(operator.address);

	const ownerBalanceBefore = await damToken.balanceOf(owner.address);
	const totalSupplyBefore = await damToken.totalSupply();

	// Operator burns tokens: Execute the `operatorBurn` function.
	// This is the core action being tested for its effects.
	const burnTx = await damToken.connect(operator).operatorBurn(owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);

	const expectedBalanceAfter = ownerBalanceBefore - burnAmount;
	const expectedSupplyAfter = totalSupplyBefore - burnAmount;

	// Assertions: Verify that the token balances and total supply are updated correctly.
	// This confirms the successful reduction of tokens from the owner's balance and overall supply.
	expect(await damToken.balanceOf(owner.address)).to.equal(expectedBalanceAfter);
	expect(await damToken.totalSupply()).to.equal(expectedSupplyAfter);

	// Assert that the `Burned` event is emitted with the correct arguments.
	// This verifies that the contract correctly signals the burn operation, which is important for off-chain indexing and auditing.
	await expect(burnTx)
		.to.emit(damToken, EventNames.Burned)
		.withArgs(operator.address, owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);

	// Assert that the `Transfer` event is emitted from the owner to the zero address.
	// This is the standard ERC20/ERC777 way to represent tokens being removed from circulation.
	await expect(burnTx).to.emit(damToken, EventNames.Transfer).withArgs(owner.address, ZERO_ADDRESS, burnAmount);
}

/**
 * A generic helper to test the re-entrancy resilience of the `burnToAddress` function.
 * This helper encapsulates the full attack scenario setup, execution, and state assertions,
 * ensuring consistency between FluxToken and LockquidityToken re-entrancy tests.
 */
export async function testReentrancyOnBurn(
	token: any,
	damToken: any,
	unlockAttacker: any,
	owner: any,
	attackerAccount: any,
	burnAmount: any
) {
	const ownerLockAmount = parseUnits('100');
	const attackerLockAmount = parseUnits('100');

	// 1. Owner locks DAM to be the target of the burn.
	await lockTokens(token, damToken, owner, ownerLockAmount);

	// 2. Attacker locks DAM to mint some tokens.
	await lockTokens(token, damToken, attackerAccount, attackerLockAmount);

	// 3. Mine blocks and mint tokens for the attacker.
	const mintBlock = await mineBlocks(1000000);
	await token.connect(attackerAccount).mintToAddress(attackerAccount.address, attackerAccount.address, mintBlock);
	const attackerBalance = await token.balanceOf(attackerAccount.address);
	expect(attackerBalance).to.be.gt(0);

	// 4. Attacker transfers tokens to the attacker contract.
	await token.connect(attackerAccount).transfer(unlockAttacker.target, burnAmount);
	const attackerContractBalance = await token.balanceOf(unlockAttacker.target);
	expect(attackerContractBalance).to.equal(burnAmount);

	// 5. Set up the attack parameters within the `UnlockAttacker` contract.
	await unlockAttacker.setAttackParameters(token.target, owner.address, burnAmount);

	// 6. Get initial state of the owner's locked tokens and global burned amount.
	const initialOwnerLock = await token.addressLocks(owner.address);
	const initialGlobalBurnedAmount = await token.globalBurnedAmount();

	// 7. Execute the attack.
	await unlockAttacker.executeAttack();

	// 8. Check final state.
	const finalOwnerLock = await token.addressLocks(owner.address);
	const finalGlobalBurnedAmount = await token.globalBurnedAmount();

	// Verify that the re-entrancy protection successfully prevented double burning.
	expect(finalOwnerLock.burnedAmount).to.equal(initialOwnerLock.burnedAmount + burnAmount);
	expect(finalGlobalBurnedAmount).to.equal(initialGlobalBurnedAmount + burnAmount);
}

/**
 * Common validation test: Should revert if burn amount is 0
 */
export async function testRevertBurnZeroAmount(token: any, damToken: any, owner: any, expectedMessage: string) {
	await lockTokens(token, damToken, owner, parseUnits('100'));
	await expect(token.connect(owner).burnToAddress(owner.address, 0)).to.be.revertedWith(expectedMessage);
}

/**
 * Common validation test: Should revert if burning to an unlocked address
 */
export async function testRevertBurnToUnlockedAddress(
	token: any,
	damToken: any,
	owner: any,
	unlockedAccount: any,
	expectedMessage: string
) {
	await lockTokens(token, damToken, owner, parseUnits('100'));

	const mintBlock = await mineBlocks(100);
	await token.connect(owner).mintToAddress(owner.address, owner.address, mintBlock);
	const ownerBalance = await token.balanceOf(owner.address);
	expect(ownerBalance).to.be.gt(0);

	await expect(token.connect(owner).burnToAddress(unlockedAccount.address, parseUnits('1'))).to.be.revertedWith(
		expectedMessage
	);
}
