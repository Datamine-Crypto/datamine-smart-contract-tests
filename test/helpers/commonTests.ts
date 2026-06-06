import { expect } from 'chai';
import { EMPTY_BYTES, EventNames, ZERO_ADDRESS, mineBlocks, lockTokens, parseUnits, RevertMessages } from './common';

/**
 * @dev This file contains reusable test logic for common contract functionalities.
 * The purpose is to ensure consistency and reduce redundancy across multiple test files,
 * making the test suite more maintainable and readable.
 */

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
 * A generic helper to test that it is not possible to mint tokens for a past lock period after re-locking.
 */
export async function testMintPastLockPeriodAfterReLock(token: any, damToken: any, owner: any, lockAmount: bigint) {
	const { mintTokens } = await import('./setupHelpers');

	// First lock to establish an initial state.
	await lockTokens(token, damToken, owner, lockAmount);

	// Mint after 10 blocks to record a lastMintBlockNumber.
	const mintBlock1 = await mintTokens(token, owner, owner.address, 10);

	// Unlock and then re-lock to simulate a user re-engaging with the system.
	await token.connect(owner).unlock();
	await mineBlocks(10);
	await lockTokens(token, damToken, owner, lockAmount);

	// Attempt to mint again using the *old* mint block number (mintBlock1).
	await expect(token.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1)).to.be.revertedWith(
		RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK
	);
}

/**
 * Common validation test: Should revert if lock amount is 0
 */
export async function testRevertLockZeroAmount(token: any, owner: any) {
	await expect(token.connect(owner).lock(owner.address, 0)).to.be.revertedWith(
		RevertMessages.YOU_MUST_PROVIDE_A_POSITIVE_AMOUNT_TO_LOCK_IN
	);
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

/**
 * Common validation test: Should revert if trying to unlock without locked tokens
 */
export async function testRevertUnlockWithoutLockedTokens(token: any, owner: any, expectedMessage: string) {
	await expect(token.connect(owner).unlock()).to.be.revertedWith(expectedMessage);
}

/**
 * Common validation test: Should revert when attempting to lock tokens when already locked
 */
export async function testRevertLockWhenAlreadyLocked(
	token: any,
	damToken: any,
	owner: any,
	lockAmount: bigint,
	expectedMessage: string
) {
	// First lock should succeed
	await lockTokens(token, damToken, owner, lockAmount);

	// Second lock attempt on same address without unlocking first should revert
	await expect(token.connect(owner).lock(owner.address, lockAmount)).to.be.revertedWith(expectedMessage);
}

/**
 * A generic helper to test the locking and unlocking of DAM tokens.
 */
export async function testLockAndUnlock(token: any, damToken: any, user: any, lockAmount: bigint) {
	const initialBalance = await damToken.balanceOf(user.address);

	await lockTokens(token, damToken, user, lockAmount);

	// Verify that DAM tokens are correctly transferred to the token contract upon locking.
	expect(await damToken.balanceOf(user.address)).to.equal(initialBalance - lockAmount);
	expect(await damToken.balanceOf(token.target)).to.equal(lockAmount);

	// Test the unlock mechanism
	await expect(token.connect(user).unlock()).to.emit(token, EventNames.Unlocked).withArgs(user.address, lockAmount, 0);

	// Verify that the user's balance is fully restored after unlocking.
	expect(await damToken.balanceOf(user.address)).to.equal(initialBalance);
}

/**
 * A generic helper to test locking of DAM tokens in a token contract.
 */
export async function testLockTokens(token: any, damToken: any, user: any, lockAmount: bigint) {
	await lockTokens(token, damToken, user, lockAmount);
	expect(await damToken.balanceOf(token.target)).to.equal(lockAmount);
}

/**
 * A generic helper to test the failsafe lock limits and their lift-off after failsafe block duration.
 */
export async function testFailsafeLifecycle(
	ethers: any,
	contractName: string,
	damToken: any,
	owner: any,
	user: any,
	failsafeRevertMessage: string,
	deployArgs: any[]
) {
	const ContractFactory = await ethers.getContractFactory(contractName);
	const tokenWithFailsafe = await ContractFactory.deploy(...deployArgs);

	const lockInAmount = parseUnits('1000');
	const lockInAmountSafe = parseUnits('100');

	// Transfer DAM to user to have funds to lock.
	await damToken.connect(owner).transfer(user.address, lockInAmount);

	// 1. Locking more than failsafe limit should revert
	await damToken.connect(user).authorizeOperator(tokenWithFailsafe.target);
	await expect(tokenWithFailsafe.connect(user).lock(user.address, lockInAmount)).to.be.revertedWith(
		failsafeRevertMessage
	);

	// 2. Locking within failsafe limit should succeed
	await lockTokens(tokenWithFailsafe, damToken, user, lockInAmountSafe);
	await tokenWithFailsafe.connect(user).unlock();

	// 3. Fast-forward blocks past failsafe period
	await mineBlocks(30);

	// 4. Locking above failsafe limit should now succeed
	await lockTokens(tokenWithFailsafe, damToken, user, lockInAmount);
}

/**
 * A generic helper to test that minting reverts if targetBlock is in the future.
 */
export async function testMintRevertFutureBlock(token: any, owner: any, ethers: any) {
	const futureBlock = (await ethers.provider.getBlockNumber()) + 100;
	await expect(token.connect(owner).mintToAddress(owner.address, owner.address, futureBlock)).to.be.revertedWith(
		RevertMessages.YOU_CAN_ONLY_MINT_UP_TO_CURRENT_BLOCK
	);
}

/**
 * A generic helper to test that minting reverts if targetBlock is before lastMintBlockNumber.
 */
export async function testMintRevertBeforeLastMint(token: any, owner: any) {
	const { mintTokens } = await import('./setupHelpers');
	const blockAfterLock = await mintTokens(token, owner, owner.address, 1);
	await expect(token.connect(owner).mintToAddress(owner.address, owner.address, blockAfterLock)).to.be.revertedWith(
		RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK
	);
}

/**
 * A generic helper to test that minting reverts if caller is not the minterAddress.
 */
export async function testMintRevertNotMinter(token: any, owner: any, otherAccount: any) {
	const block = await mineBlocks(1);
	await expect(
		token.connect(otherAccount).mintToAddress(owner.address, otherAccount.address, block)
	).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
}

/**
 * A generic helper to test successful token minting based on time progression.
 */
export async function testSuccessfulMint(token: any, owner: any) {
	const mintBlock = await mineBlocks(1);
	const expectedMintAmount = await token.getMintAmount(owner.address, mintBlock);
	await token.connect(owner).mintToAddress(owner.address, owner.address, mintBlock);

	const balance = await token.balanceOf(owner.address);
	expect(balance).to.equal(expectedMintAmount);
}
