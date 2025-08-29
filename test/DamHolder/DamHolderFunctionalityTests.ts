import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  mineBlocks,
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployLockquidityContracts,
  deployDamHolder,
  setupHolderForLocking,
} from '../helpers';

describe('DamHolder Functionality', function () {
  async function deployLockTokenFixture() {
    const [owner, addrB] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
    const damHolder = await deployDamHolder();

    return { lockquidityFactory, lockquidityToken, owner, addrB, damToken, damHolder };
  }

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

      // This test ensures that the `DamHolder` cannot authorize an operator for a non-ERC777 token (simulated by an EOA).
      // This is crucial for preventing misconfigurations and ensuring that operator authorizations are only attempted
      // with compatible token contracts.
      await expect(damHolder.authorizeOperator(nonErc777TokenAddress, operator)).to.be.reverted;
    });
  });
});
