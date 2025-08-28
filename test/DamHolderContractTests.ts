import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat'; // Added explicit ethers import
import {
  mineBlocks,
  parseUnits,
  getERC1820Registry,
  ContractNames,
  EventNames,
  RevertMessages,
  EMPTY_BYTES,
  deployDamToken,
  deployLockquidityContracts,
  deployDamHolder,
  TOKENS_SENDER_INTERFACE_HASH,
  TOKENS_RECIPIENT_INTERFACE_HASH,
  setupHolderForLocking,
} from './helpers';

/**
 * @title DamHolder Contract Tests
 * @dev Tests for the DamHolder contract, which is designed to hold and manage DAM tokens.
 * These tests cover token transfers, locking mechanics, ERC777 hooks, and various security scenarios.
 */
describe('DamHolder Contract Test', function () {
  /**
   * @dev Fixture to deploy the required contracts for testing.
   * This includes DamToken, LockquidityFactory (which deploys LockquidityToken), and DamHolder.
   */
  async function deployLockTokenFixture() {
    const [owner, addrB] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
    const damHolder = await deployDamHolder();

    return { lockquidityFactory, lockquidityToken, owner, addrB, damToken, damHolder };
  }

  /**
   * @dev Tests related to the deployment and initial state of the contracts.
   */
  describe('Deployment', function () {
    it('Should allow sending 100 DAM tokens to a DamHolder contract', async function () {
      const { damToken, owner, damHolder } = await loadFixture(deployLockTokenFixture);
      const amountToSend = parseUnits('100');

      // Expect the transfer to emit a "Transfer" event with the correct arguments
      await expect(damToken.connect(owner).transfer(damHolder.target, amountToSend))
        .to.emit(damToken, EventNames.Transfer)
        .withArgs(owner.address, damHolder.target, amountToSend);

      // Verify the DamHolder's balance
      expect(await damToken.balanceOf(damHolder.target)).to.equal(amountToSend);
    });

    it('Should allow DamHolder to lock DAM tokens after receiving from owner', async function () {
      const { owner, damHolder, damToken, lockquidityToken } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('100', 18);

      // Setup holder with tokens and operator authorization
      await setupHolderForLocking(owner, damHolder, damToken, lockquidityToken, lockAmount);

      // Verify initial balance of DamHolder
      expect(await damToken.balanceOf(damHolder.target)).to.equal(lockAmount);

      // DamHolder locks its token balance into Lockquidity
      await damHolder.connect(owner).lock(lockquidityToken.target, damHolder.target, lockAmount);

      // DAM tokens should now be in the Lockquidity contract
      expect(await damToken.balanceOf(lockquidityToken.target)).to.equal(lockAmount);
      // DamHolder's balance should be zero
      expect(await damToken.balanceOf(damHolder.target)).to.equal(0);
    });

    it('Should correctly register ERC1820 interfaces in constructor', async function () {
      const { damHolder } = await loadFixture(deployLockTokenFixture);

      // Get the ERC1820 registry instance using its fully qualified name
      const erc1820Registry = await getERC1820Registry();

      // Verify that DamHolder is registered as implementer for both interfaces
      expect(await erc1820Registry.getInterfaceImplementer(damHolder.target, TOKENS_SENDER_INTERFACE_HASH)).to.equal(
        damHolder.target,
      );
      expect(await erc1820Registry.getInterfaceImplementer(damHolder.target, TOKENS_RECIPIENT_INTERFACE_HASH)).to.equal(
        damHolder.target,
      );
    });
  });

  /**
   * @dev Tests for the ERC777 hooks (`tokensToSend` and `tokensReceived`).
   */
  describe('Hooks', function () {
    it('Should emit TokensReceivedCalled event with correct arguments when receiving tokens', async function () {
      const { damToken, owner, damHolder } = await loadFixture(deployLockTokenFixture);
      const amountToSend = parseUnits('100');
      const userData = ethers.toUtf8Bytes('some user data');
      // operatorData is empty for send, as per ERC777 standard for `send` function
      const emptyOperatorData = ethers.toUtf8Bytes('');

      // The transfer should trigger the `tokensReceived` hook on the DamHolder
      await expect(damToken.connect(owner).send(damHolder.target, amountToSend, userData)) // Use send to pass userData
        .to.emit(damHolder, EventNames.TokensReceivedCalled)
        .withArgs(owner.address, owner.address, damHolder.target, amountToSend, userData, emptyOperatorData);
    });

    it('Should emit TokensToSendCalled event with correct arguments when sending tokens', async function () {
      const { owner, damHolder, damToken, lockquidityToken } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('100');
      // userData and operatorData are empty for operatorSend called by LockquidityToken
      const emptyBytes = ethers.toUtf8Bytes('');

      // Setup holder with tokens and operator authorization
      await setupHolderForLocking(owner, damHolder, damToken, lockquidityToken, lockAmount);

      // The lock action will send tokens from DamHolder, triggering the `tokensToSend` hook
      // The lock function in DamHolder calls operatorSend with empty userData and operatorData
      await expect(damHolder.connect(owner).lock(lockquidityToken.target, damHolder.target, lockAmount))
        .to.emit(damHolder, EventNames.TokensToSendCalled)
        .withArgs(
          lockquidityToken.target,
          damHolder.target,
          lockquidityToken.target,
          lockAmount,
          emptyBytes,
          emptyBytes,
        );
    });
  });

  /**
   * @dev Tests for core functionalities and security aspects of the DamHolder contract.
   */
  describe('Functionality', function () {
    it('Should successfully authorize an operator', async function () {
      const { damToken, owner, damHolder, addrB } = await loadFixture(deployLockTokenFixture);
      const operator = addrB.address;

      // Authorize addrB as an operator for the DamHolder's tokens
      await damHolder.connect(owner).authorizeOperator(damToken.target, operator);

      // Verify that the operator is authorized
      expect(await damToken.isOperatorFor(operator, damHolder.target)).to.be.true;
    });

    it('Should fail to lock if operator is not authorized', async function () {
      const { owner, damHolder, damToken, lockquidityToken } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('100', 18);

      // Transfer tokens to DamHolder but do NOT authorize the operator
      await damToken.connect(owner).transfer(damHolder.target, lockAmount);

      // Expect the lock to be reverted because LockquidityToken is not an authorized operator
      await expect(
        damHolder.connect(owner).lock(lockquidityToken.target, damHolder.target, lockAmount),
      ).to.be.revertedWith(RevertMessages.ERC777_CALLER_IS_NOT_AN_OPERATOR_FOR_HOLDER);
    });

    it('Should fail to lock more than 100 tokens during failsafe period', async function () {
      const { owner, damHolder, damToken, lockquidityToken } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('101'); // More than failsafe limit

      // Setup holder with tokens and operator authorization
      await setupHolderForLocking(owner, damHolder, damToken, lockquidityToken, lockAmount);

      // Expect the lock to be reverted due to the failsafe limit in LockquidityToken
      await expect(
        damHolder.connect(owner).lock(lockquidityToken.target, damHolder.target, lockAmount),
      ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_LOCK_IN_UP_TO_100_ARBI_FLUX_DURING_FAILSAFE);
    });

    it('Should fail to lock more tokens than balance', async function () {
      const { owner, damHolder, damToken, lockquidityToken } = await loadFixture(deployLockTokenFixture);
      const initialBalance = parseUnits('50');
      const lockAmount = parseUnits('51'); // More than balance

      // Setup holder with 50 tokens and operator authorization
      await setupHolderForLocking(owner, damHolder, damToken, lockquidityToken, initialBalance);

      // Fast-forward blocks to move past the failsafe period of the LockquidityToken
      await mineBlocks(161280);

      // Expect the lock to be reverted because the lock amount exceeds the holder's balance
      await expect(
        damHolder.connect(owner).lock(lockquidityToken.target, damHolder.target, lockAmount),
      ).to.be.revertedWith(RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE);
    });

    it('Should receive Ether via the receive() fallback function', async function () {
      const { damHolder } = await loadFixture(deployLockTokenFixture);
      const [owner] = await ethers.getSigners();
      const amount = ethers.parseEther('1.0');

      // Send Ether to the contract
      await expect(owner.sendTransaction({ to: damHolder.target, value: amount })).to.not.be.reverted;

      // Verify the contract's Ether balance
      expect(await ethers.provider.getBalance(damHolder.target)).to.equal(amount);
    });

    it('Should allow any address to trigger lock if operator is authorized', async function () {
      const { owner, addrB, damHolder, damToken, lockquidityToken } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('100');

      // Setup holder with tokens and operator authorization
      await setupHolderForLocking(owner, damHolder, damToken, lockquidityToken, lockAmount);

      // A different address (addrB) calls the lock function
      await expect(damHolder.connect(addrB).lock(lockquidityToken.target, damHolder.target, lockAmount)).to.not.be
        .reverted;

      // Verify tokens were moved correctly
      expect(await damToken.balanceOf(lockquidityToken.target)).to.equal(lockAmount);
      expect(await damToken.balanceOf(damHolder.target)).to.equal(0);
    });

    it('Should fail to lock zero tokens', async function () {
      const { owner, damHolder, damToken, lockquidityToken } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('0', 18);

      // Authorize operator, even though the amount is zero
      await damHolder.connect(owner).authorizeOperator(damToken.target, lockquidityToken.target);

      // Expect the lock to be reverted because LockquidityToken requires a positive amount
      await expect(
        damHolder.connect(owner).lock(lockquidityToken.target, damHolder.target, lockAmount),
      ).to.be.revertedWith(RevertMessages.YOU_MUST_PROVIDE_A_POSITIVE_AMOUNT_TO_LOCK_IN);
    });

    it('Should fail when authorizing self as operator', async function () {
      const { damToken, damHolder } = await loadFixture(deployLockTokenFixture);

      // Attempting to authorize the DamHolder contract itself as an operator for its own tokens
      // This should be disallowed by the ERC777 token contract
      await expect(damHolder.authorizeOperator(damToken.target, damHolder.target)).to.be.revertedWith(
        RevertMessages.ERC777_AUTHORIZING_SELF_AS_OPERATOR,
      );
    });

    it('Should fail to authorize operator for a non-ERC777 token', async function () {
      const { damHolder, addrB } = await loadFixture(deployLockTokenFixture);

      // Using an Externally Owned Account (EOA) as a stand-in for a non-ERC777 contract
      const nonErc777TokenAddress = addrB.address;
      const operator = addrB.address;

      // The call should revert because the target address is not a contract with an authorizeOperator function
      await expect(damHolder.authorizeOperator(nonErc777TokenAddress, operator)).to.be.reverted;
    });
  });
});
