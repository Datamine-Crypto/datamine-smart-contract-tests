import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  ZERO_ADDRESS,
  EventNames,
  RevertMessages,
  EMPTY_BYTES,
  deployDamToken,
  deployDamTokenFixture,
} from '../helpers';

describe('DamToken Send Operations', function () {
  describe('send function tests', function () {
    let damToken: any;
    let owner: any;
    let otherAccount: any;
    let initialSupply: any;

    beforeEach(async function () {
      // Set up a fresh state for each test within this block to ensure test isolation and predictability.
      ({ damToken, owner, otherAccount } = await loadFixture(deployDamTokenFixture));
      initialSupply = await damToken.totalSupply();
    });

    it('Should allow sending tokens to another address', async function () {
      const amountToSend = parseUnits('100');
      const ownerBalanceBefore = await damToken.balanceOf(owner.address);
      const otherAccountBalanceBefore = await damToken.balanceOf(otherAccount.address);

      // Verify that tokens can be successfully transferred from one address to another,
      // and that the correct ERC777 `Sent` event is emitted.
      await expect(damToken.connect(owner).send(otherAccount.address, amountToSend, EMPTY_BYTES))
        .to.emit(damToken, EventNames.Sent)
        .withArgs(owner.address, owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES);

      // Confirm that balances are updated correctly after the transfer.
      expect(await damToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore - amountToSend);
      expect(await damToken.balanceOf(otherAccount.address)).to.equal(otherAccountBalanceBefore + amountToSend);
    });

    it('Should revert when sending more tokens than balance', async function () {
      const amountToSend = initialSupply + parseUnits('1'); // More than owner's balance
      // This test enforces a critical security measure: preventing users from sending more tokens than their
      // available balance. This is fundamental for maintaining the integrity of the token supply and preventing
      // negative balances or unauthorized token creation.
      await expect(damToken.connect(owner).send(otherAccount.address, amountToSend, EMPTY_BYTES)).to.be.revertedWith(
        RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE,
      );
    });

    it('Should revert when sending tokens to the zero address', async function () {
      const amountToSend = parseUnits('100');
      // Prevent accidental burning or sending to an unrecoverable address.
      // Sending to the zero address is typically disallowed in ERC777 to avoid loss of tokens.
      await expect(damToken.connect(owner).send(ZERO_ADDRESS, amountToSend, EMPTY_BYTES)).to.be.revertedWith(
        RevertMessages.ERC777_SEND_TO_THE_ZERO_ADDRESS,
      );
    });
  });
});
