import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  getERC1820Registry,
  EventNames,
  ZERO_ADDRESS,
  TOKENS_SENDER_INTERFACE_HASH,
  TOKENS_RECIPIENT_INTERFACE_HASH,
  deployDamToken,
  deployLockquidityContracts,
  deployDamHolder,
  setupHolderForLocking,
} from '../helpers';

describe('DamHolder Deployment', function () {
  async function deployLockTokenFixture() {
    const [owner, addrB] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken } = await deployLockquidityContracts(damToken.target);
    const damHolder = await deployDamHolder();

    return { lockquidityFactory, lockquidityToken, owner, addrB, damToken, damHolder };
  }

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
});
