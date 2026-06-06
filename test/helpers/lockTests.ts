import { expect } from 'chai';
import { RevertMessages, EventNames } from './constants';
import { lockTokens, parseUnits } from './tokens';
import { mineBlocks } from './blockchain';

/**
 * Common validation test: Should revert if lock amount is 0
 */
export async function testRevertLockZeroAmount(token: any, owner: any) {
	await expect(token.connect(owner).lock(owner.address, 0)).to.be.revertedWith(
		RevertMessages.YOU_MUST_PROVIDE_A_POSITIVE_AMOUNT_TO_LOCK_IN
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
