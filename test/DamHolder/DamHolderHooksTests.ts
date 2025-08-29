import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  EventNames,
  EMPTY_BYTES,
  deployDamToken,
  deployLockquidityContracts,
  deployDamHolder,
  setupHolderForLocking,
} from '../helpers';

describe('DamHolder Hooks', function () {
  async function deployLockTokenFixture() {
    const [owner, addrB] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
    const damHolder = await deployDamHolder();

    return { lockquidityFactory, lockquidityToken, owner, addrB, damToken, damHolder };
  }

  describe('Hooks', function () {
    it('Should emit TokensReceivedCalled event with correct arguments when receiving tokens', async function () {
      const { damToken, owner, damHolder } = await loadFixture(deployLockTokenFixture);
      const amountToSend = parseUnits('100');
      const userData = ethers.toUtf8Bytes('some user data');
      // operatorData is empty for send, as per ERC777 standard for `send` function
      const emptyOperatorData = ethers.toUtf8Bytes('');

      // This test verifies that the `tokensReceived` hook on the `DamHolder` contract is correctly triggered
      // and emits the `TokensReceivedCalled` event with accurate arguments when it receives tokens. This is crucial
      // for confirming the proper implementation of ERC777 receiver hooks, which are vital for handling incoming
      // token transfers and enabling custom logic upon receipt.
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
});
