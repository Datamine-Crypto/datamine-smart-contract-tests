import { ethers } from 'hardhat';
import { expect } from 'chai';
import { mineBlocks, EMPTY_BYTES, EventNames, ZERO_ADDRESS } from './common';

/**
 * @dev This file centralizes helper functions for setting up specific test scenarios.
 * The purpose of these helpers is to create consistent and complex initial states
 * for tests, reducing boilerplate and improving the readability and maintainability
 * of the test suite.
 */

/**
 * Sets up the DamBlockingHolder contract for a re-entrancy test.
 * This helper is crucial for preparing the contract with specific test parameters,
 * initial token balances, and operator authorizations, enabling controlled
 * simulation of re-entrancy attack vectors.
 * @param damBlockingHolder The DamBlockingHolder contract instance.
 * @param owner The owner/signer account.
 * @param damToken The DAM token contract instance.
 * @param lockquidityToken The LockquidityToken contract instance.
 * @param initialAmount The initial amount of DAM to transfer to the holder.
 * @param lockAmount The amount of DAM to be locked in the test.
 * @param hookSendAmount The amount of DAM to be sent from within the ERC777 hook.
 * @param unitTestCase The specific unit test case to execute (enum value).
 */
export async function setupDamBlockingHolderTest(
  damBlockingHolder: any,
  owner: any,
  damToken: any,
  lockquidityToken: any,
  initialAmount: any,
  lockAmount: any,
  hookSendAmount: any,
  unitTestCase: any,
) {
  await damBlockingHolder.connect(owner).setUnitTestCase(unitTestCase);
  expect(await damBlockingHolder.unitTestCase()).to.equal(unitTestCase);

  await damBlockingHolder.connect(owner).setHookSendAmount(hookSendAmount);

  // Transfer initialAmount DAM from owner to DamBlockingHolder contract to provide it with funds for testing.
  await damToken.connect(owner).transfer(damBlockingHolder.target, initialAmount);

  // Make sure it has initialAmount DAM to confirm the transfer was successful.
  expect(await damToken.balanceOf(damBlockingHolder.target)).to.equal(initialAmount);

  // DamBlockingHolder contract authorizes LockquidityToken. This is essential because
  // LockquidityToken needs permission to take DAM from DamBlockingHolder during lock operations.
  await damBlockingHolder.connect(owner).authorizeOperator(damToken.target, lockquidityToken.target);
}

/**
 * Sets up a DAM holder with DAM tokens and authorizes the FluxToken as an operator.
 * This helper prepares a scenario where a user's DAM tokens are ready to be locked
 * into the FluxToken contract, enabling tests of the locking mechanism.
 * @param damToken The DAM token contract instance.
 * @param owner The owner/signer account.
 * @param damHolderAddress The address of the DAM holder (can be a contract or EOA).
 * @param fluxToken The FluxToken contract instance.
 * @param damAmount The amount of DAM to send to the holder.
 */
export async function setupDamAndFluxTokens(
  damToken: any,
  owner: any,
  damHolderAddress: any,
  fluxToken: any,
  damAmount: any,
) {
  // Send DAM tokens to the holder address to provide them with a balance.
  await damToken.connect(owner).send(damHolderAddress.address, damAmount, EMPTY_BYTES);
  // Authorize FluxToken as an operator. This grants FluxToken permission to move DAM tokens
  // from the holder's address when they initiate a lock operation.
  await damToken.connect(damHolderAddress).authorizeOperator(fluxToken.target);
}

/**
 * Prepares a DamHolder contract for locking by transferring DAM tokens to it and authorizing a lockable token contract.
 * This helper streamlines the setup for tests involving the DamHolder's interaction with locking mechanisms,
 * ensuring the holder has tokens and the locking contract has the necessary permissions.
 * @param owner The owner/signer account.
 * @param damHolder The DamHolder contract instance.
 * @param damToken The DAM token contract instance.
 * @param lockableToken The token contract that will be locking the DAM (e.g., FluxToken or LockquidityToken).
 * @param amount The amount of DAM to transfer and prepare for locking.
 */
export async function setupHolderForLocking(
  owner: any,
  damHolder: any,
  damToken: any,
  lockableToken: any,
  amount: any,
) {
  // Transfer DAM from the owner to the DamHolder contract to provide it with funds.
  await damToken.connect(owner).transfer(damHolder.target, amount);
  // Authorize the LockableToken contract to spend DAM tokens on behalf of the DamHolder.
  // This is a critical step to allow the locking contract to pull tokens from the holder.
  await damHolder.connect(owner).authorizeOperator(damToken.target, lockableToken.target);
}

/**
 * A generic helper to authorize and lock tokens in one step.
 * This simplifies test scenarios where a user needs to lock tokens,
 * ensuring the necessary authorization is handled automatically.
 * @param token The token contract to lock into (e.g., FluxToken, LockquidityToken).
 * @param damToken The DAM token contract instance.
 * @param user The user/signer account performing the lock.
 * @param amount The amount of DAM to lock.
 * @param minterAddress Optional address to be designated as the minter. Defaults to the user's address.
 * @returns The block number after the lock transaction.
 */
export async function lockTokens(token: any, damToken: any, user: any, amount: any, minterAddress?: any) {
  const minter = minterAddress || user.address;
  // Authorize the target token contract to spend DAM tokens on behalf of the user.
  // This is required for the `lock` function to pull DAM tokens from the user.
  await damToken.connect(user).authorizeOperator(token.target);
  // Execute the lock operation.
  await token.connect(user).lock(minter, amount);
  // Return the current block number to allow for time-dependent assertions in tests.
  return await ethers.provider.getBlockNumber();
}

/**
 * Advances blocks and mints Flux tokens for a given source address.
 * This helper streamlines the process of simulating time progression and
 * subsequent token minting, which is common in FluxToken tests.
 * @param fluxToken The FluxToken contract instance.
 * @param minter The user/signer account who is authorized to mint.
 * @param sourceAddress The address that has locked DAM and is the source of the minting.
 * @param blocksToAdvance The number of blocks to mine before minting.
 * @returns The block number after the mint transaction.
 */
export async function mintFluxTokens(fluxToken: any, minter: any, sourceAddress: any, blocksToAdvance: number) {
  // Advance blocks to simulate time passing, which is necessary for minting rewards to accrue.
  const mintBlock = await mineBlocks(blocksToAdvance);
  // Perform the minting operation.
  await fluxToken.connect(minter).mintToAddress(sourceAddress, minter.address, mintBlock);
  return mintBlock;
}

/**
 * Advances blocks and mints Lock tokens for a given source address.
 * Similar to `mintFluxTokens`, this helper simplifies testing scenarios
 * involving time-dependent LOCK token minting.
 * @param lockToken The LockquidityToken contract instance.
 * @param minter The user/signer account who is authorized to mint.
 * @param sourceAddress The address that has locked DAM and is the source of the minting.
 * @param blocksToAdvance The number of blocks to mine before minting.
 * @returns The block number after the mint transaction.
 */
export async function mintLockTokens(lockToken: any, minter: any, sourceAddress: any, blocksToAdvance: number) {
  // Advance blocks to simulate time passing, allowing minting rewards to accrue.
  const mintBlock = await mineBlocks(blocksToAdvance);
  // Perform the minting operation.
  await lockToken.connect(minter).mintToAddress(sourceAddress, minter.address, mintBlock);
  return mintBlock;
}
