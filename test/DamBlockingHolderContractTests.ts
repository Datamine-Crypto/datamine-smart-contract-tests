import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat'; // Added explicit ethers import
import {
  parseUnits,
  ContractNames,
  EventNames,
  RevertMessages,
  UnitTestCases,
  deployDamToken,
  deployLockquidityContracts,
  deployDamBlockingHolder,
  deployLockquidityToken,
  setupDamBlockingHolderTest,
} from './helpers';

/**
 * Showcases that a smart contract can receive/send tokens (this is a good base to start for security researchers testing re-entrancy attacks)
 */
describe('DamBlockingHolder Contract Test', function () {
  async function deployLockTokenFixture() {
    const [owner, addrB] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
    const damBlockingHolder = await deployDamBlockingHolder(lockquidityToken.target);

    return { lockquidityFactory, owner, addrB, damToken, damBlockingHolder, lockquidityToken };
  }

  async function deployLockTokenFixtureNoFailsafe() {
    const [owner, addrB] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const lockquidityToken = await deployLockquidityToken(damToken.target, 5760, 161280, 0, owner.address); // failsafe disabled
    const damBlockingHolder = await deployDamBlockingHolder(lockquidityToken.target);

    return { lockquidityToken, owner, addrB, damToken, damBlockingHolder };
  }

  describe('Re-Entry Tests', function () {
    it('Re-Entry Test: DamBlockingHolder should prevent unlock() inside lock() with mutex AND allow send() before lock() finishes', async function () {
      const { owner, damBlockingHolder, lockquidityToken, damToken } = await loadFixture(deployLockTokenFixture);

      const initialAmount = parseUnits('200');
      const lockAmount = parseUnits('100');
      const hookSendAmount = lockAmount; // In this specific test, hookSendAmount is the same as lockAmount

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

      //DamBlockingHolder now locks it's token balance into Lockquidity
      const lockTxPromise = damBlockingHolder
        .connect(owner)
        .lock(lockquidityToken.target, damBlockingHolder.target, lockAmount);

      // Now we want to make sure we intercepted the sending with a hook
      expect(await lockTxPromise).to.emit(damBlockingHolder, EventNames.TokensToSendHookExecuted);

      // We want to make sure the tokens actually got locked
      expect(await lockTxPromise).to.emit(lockquidityToken, EventNames.Locked);

      // The hook will call .unlock() and we want to make sure the preventRecursion effectively stopped it
      expect(await lockTxPromise).to.not.emit(lockquidityToken, EventNames.Unlocked);

      // DAM tokens should be in Lockquidity
      expect(await damToken.balanceOf(lockquidityToken.target)).to.equal(lockAmount);

      // DamBlockingHolder smart contract should have 0 tokens
      expect(await damToken.balanceOf(damBlockingHolder.target)).to.equal(0);
    });

    async function testRevert(lockAmount: any, hookSendAmount: any) {
      const { lockquidityToken, owner, damBlockingHolder, damToken } = await loadFixture(
        deployLockTokenFixtureNoFailsafe,
      );

      const initialAmount = parseUnits('200');

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

      //DamBlockingHolder now locks it's token balance into Lockquidity
      await expect(
        damBlockingHolder.connect(owner).lock(lockquidityToken.target, damBlockingHolder.target, lockAmount),
      ).to.be.revertedWith(RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE);
    }

    it('Re-Entry Test: Should revert if lock amount + hook send amount is greater than balance', async function () {
      await testRevert(parseUnits('101'), parseUnits('100'));
    });

    it('Re-Entry Test: Should revert if hook send amount is greater than balance after lock', async function () {
      await testRevert(parseUnits('100'), parseUnits('101'));
    });
  });
});
