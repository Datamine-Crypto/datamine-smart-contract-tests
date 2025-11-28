import { expect } from 'chai';
import {
  parseUnits,
  EventNames,
  RevertMessages,
  UnitTestCases,
  setupDamBlockingHolderTest,
  deployReentrancyTestFixture,
  loadFixture,
} from '../helpers/index.js';

/**
 * @dev This test suite focuses on re-entrancy attack vectors using ERC777 hooks within the DamBlockingHolder contract.
 * The primary goal is to demonstrate that while re-entry is technically possible due to ERC777's design,
 * the contract's internal mutex and balance checks effectively prevent any unwanted side-effects or exploits,
 * ensuring the security and integrity of token operations, especially burning functionality.
 */
describe('DamBlockingHolder Contract Test', function () {
  describe('Re-Entry Tests', function () {
    /**
     * @dev This test is crucial for demonstrating the effectiveness of the re-entrancy mutex.
     * It simulates a re-entrant call to `unlock()` from within the `tokensToSend` hook during a `lock()` operation.
     * The test asserts that while the hook is triggered (allowing a `send()` operation), the re-entrant `unlock()` call
     * is successfully prevented by the mutex, ensuring that core burning functionality is not compromised by re-entry.
     * This confirms that the contract can safely handle re-entrant calls without leading to unintended state changes.
     */
    it('Re-Entry Test: DamBlockingHolder should prevent unlock() inside lock() with mutex AND allow send() before lock() finishes', async function () {
      const { owner, damBlockingHolder, lockquidityToken, damToken } = await loadFixture(deployReentrancyTestFixture);

      const initialAmount = parseUnits('200');
      const lockAmount = parseUnits('100');
      // Set hookSendAmount equal to lockAmount to simulate a scenario where the re-entrant call attempts to spend
      // an amount equal to the primary operation's value, testing the balance checks and mutex.
      const hookSendAmount = lockAmount;

      // Setup the DamBlockingHolder to trigger a specific re-entrancy scenario (calling unlock() from the hook)
      await setupDamBlockingHolderTest(
        damBlockingHolder,
        owner,
        damToken,
        lockquidityToken,
        initialAmount,
        lockAmount,
        hookSendAmount,
        UnitTestCases.CallUnlockTokensToSendHook,
      );

      // Initiate the lock operation, which will trigger the ERC777 tokensToSend hook on DamBlockingHolder
      const lockTxPromise = damBlockingHolder
        .connect(owner)
        .lock(lockquidityToken.target, damBlockingHolder.target, lockAmount);

      // Expect the TokensToSendHookExecuted event to confirm that the re-entrancy hook was indeed triggered.
      expect(await lockTxPromise).to.emit(damBlockingHolder, EventNames.TokensToSendHookExecuted);

      // Expect the Locked event to confirm that the primary lock operation successfully completed.
      expect(await lockTxPromise).to.emit(lockquidityToken, EventNames.Locked);

      // Crucially, expect that the Unlocked event is NOT emitted. This verifies that the mutex
      // successfully prevented the re-entrant call to unlock() from completing,
      // safeguarding the contract's state during re-entry.
      expect(await lockTxPromise).to.not.emit(lockquidityToken, EventNames.Unlocked);

      // Verify that the DAM tokens are now correctly held by the LockquidityToken contract,
      // confirming the successful transfer despite the re-entrancy attempt.
      expect(await damToken.balanceOf(lockquidityToken.target)).to.equal(lockAmount);

      // Verify that the DamBlockingHolder contract's balance is zero, as tokens were successfully transferred out.
      expect(await damToken.balanceOf(damBlockingHolder.target)).to.equal(0);
    });

    /**
     * @dev This helper function encapsulates the common logic for testing revert conditions
     * when re-entrant calls attempt to overspend or violate balance constraints.
     * It sets up the test environment and asserts that the lock operation reverts with a specific message.
     * This promotes code reusability and clarity for similar revert scenarios.
     */
    async function testRevert(lockAmount: any, hookSendAmount: any) {
      const { lockquidityToken, owner, damBlockingHolder, damToken } = await loadFixture(deployReentrancyTestFixture);

      const initialAmount = parseUnits('200');

      // Setup the DamBlockingHolder to trigger a re-entrancy scenario where the hook attempts to send tokens.
      await setupDamBlockingHolderTest(
        damBlockingHolder,
        owner,
        damToken,
        lockquidityToken,
        initialAmount,
        lockAmount,
        hookSendAmount,
        UnitTestCases.CallSendTokensToSendHook,
      );

      // Expect the lock operation to revert. This is critical to prevent malicious re-entrant calls
      // from draining more tokens than legitimately allowed or available.
      await expect(
        damBlockingHolder.connect(owner).lock(lockquidityToken.target, damBlockingHolder.target, lockAmount),
      ).to.be.revertedWith(RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE);
    }

    /**
     * @dev This test ensures that the contract correctly reverts if the sum of the primary lock amount
     * and the amount attempted to be sent during a re-entrant hook call exceeds the available balance.
     * This prevents a re-entrancy attack where a malicious contract tries to spend more than it holds
     * by combining the initial transaction with a re-entrant one.
     */
    it('Re-Entry Test: Should revert if lock amount + hook send amount is greater than balance', async function () {
      // This test ensures that the contract correctly reverts if the sum of the primary lock amount
      // and the amount attempted to be sent during a re-entrant hook call exceeds the available balance.
      // This prevents a re-entrancy attack where a malicious contract tries to spend more than it holds
      // by combining the initial transaction with a re-entrant one, thereby safeguarding against token draining.
      await testRevert(parseUnits('101'), parseUnits('100'));
    });

    /**
     * @dev This test verifies that the contract prevents overspending even if the re-entrant hook call
     * attempts to send an amount that, by itself, exceeds the remaining balance *after* the initial lock amount
     * has been accounted for. This covers a subtle re-entrancy scenario where the attacker tries to
     * exploit the state during the execution of the primary transaction.
     */
    it('Re-Entry Test: Should revert if hook send amount is greater than balance after lock', async function () {
      await testRevert(parseUnits('100'), parseUnits('101'));
    });
  });
});
