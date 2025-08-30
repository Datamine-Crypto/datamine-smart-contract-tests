import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import {
  parseUnits,
  getERC1820Registry,
  EventNames,
  TOKENS_SENDER_INTERFACE_HASH,
  TOKENS_RECIPIENT_INTERFACE_HASH,
  setupHolderForLocking,
  deployDamHolderFixture,
} from '../helpers';

describe('DamHolder Deployment', function () {
  describe('Deployment', function () {
    it('Should allow sending 100 DAM tokens to a DamHolder contract', async function () {
      const { damToken, owner, damHolder } = await loadFixture(deployDamHolderFixture);
      const amountToSend = parseUnits('100');

      // This test verifies that DAM tokens can be successfully sent to the `DamHolder` contract. This is a foundational
      // step, as the `DamHolder` needs to receive tokens before it can perform any locking operations, confirming its
      // ability to act as a token recipient.
      await expect(damToken.connect(owner).transfer(damHolder.target, amountToSend))
        .to.emit(damToken, EventNames.Transfer)
        .withArgs(owner.address, damHolder.target, amountToSend);

      // Verify the DamHolder's balance
      expect(await damToken.balanceOf(damHolder.target)).to.equal(amountToSend);
    });

    it('Should allow DamHolder to lock DAM tokens after receiving from owner', async function () {
      const { owner, damHolder, damToken, lockquidityToken } = await loadFixture(deployDamHolderFixture);
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
      const { damHolder } = await loadFixture(deployDamHolderFixture);

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
});
