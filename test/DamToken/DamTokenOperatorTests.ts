import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  EventNames,
  RevertMessages,
  EMPTY_BYTES,
  deployDamToken,
} from '../helpers';

describe('DamToken Operator Operations', function () {
  async function deployDamTokenFixture() {
    const [owner, operatorAddress, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();

    return { damToken, owner, operatorAddress, otherAccount };
  }

  describe('authorizeOperator and revokeOperator tests', function () {
    let damToken: any;
    let owner: any;
    let operatorAddress: any;

    beforeEach(async function () {
      ({ damToken, owner, operatorAddress } = await loadFixture(deployDamTokenFixture));
    });

    it('Should allow authorizing an operator', async function () {
      await expect(damToken.connect(owner).authorizeOperator(operatorAddress.address))
        .to.emit(damToken, EventNames.AuthorizedOperator)
        .withArgs(operatorAddress.address, owner.address);
      expect(await damToken.isOperatorFor(operatorAddress.address, owner.address)).to.be.true;
    });

    it('Should allow revoking an operator', async function () {
      await damToken.connect(owner).authorizeOperator(operatorAddress.address); // First authorize
      await expect(damToken.connect(owner).revokeOperator(operatorAddress.address))
        .to.emit(damToken, EventNames.RevokedOperator)
        .withArgs(operatorAddress.address, owner.address);
      expect(await damToken.isOperatorFor(operatorAddress.address, owner.address)).to.be.false;
    });

    it('Should revert when authorizing self as operator', async function () {
      await expect(damToken.connect(owner).authorizeOperator(owner.address)).to.be.revertedWith(
        RevertMessages.ERC777_AUTHORIZING_SELF_AS_OPERATOR,
      );
    });

    it('Should revert when revoking self as operator', async function () {
      await expect(damToken.connect(owner).revokeOperator(owner.address)).to.be.revertedWith(
        RevertMessages.ERC777_REVOKING_SELF_AS_OPERATOR,
      );
    });
  });

  describe('operatorSend functionality', function () {
    let damToken: any;
    let owner: any;
    let operatorAddress: any;
    let otherAccount: any;

    beforeEach(async function () {
      ({ damToken, owner, operatorAddress, otherAccount } = await loadFixture(deployDamTokenFixture));
    });

    it('Should allow an authorized operator to send tokens', async function () {
      const amountToSend = parseUnits('50');
      const ownerBalanceBefore = await damToken.balanceOf(owner.address);
      const otherAccountBalanceBefore = await damToken.balanceOf(otherAccount.address);

      await damToken.connect(owner).authorizeOperator(operatorAddress.address);

      await expect(
        damToken
          .connect(operatorAddress)
          .operatorSend(owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES),
      )
        .to.emit(damToken, EventNames.Sent)
        .withArgs(operatorAddress.address, owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES);

      expect(await damToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore - amountToSend);
      expect(await damToken.balanceOf(otherAccount.address)).to.equal(otherAccountBalanceBefore + amountToSend);
    });

    it('Should revert when an unauthorized operator tries to send tokens', async function () {
      const amountToSend = parseUnits('50');
      await expect(
        damToken
          .connect(operatorAddress)
          .operatorSend(owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES),
      ).to.be.revertedWith(RevertMessages.ERC777_CALLER_IS_NOT_AN_OPERATOR_FOR_HOLDER);
    });
  });

  describe('defaultOperators', function () {
    let damToken: any;

    beforeEach(async function () {
      ({ damToken } = await loadFixture(deployDamTokenFixture));
    });

    it('Should return an empty array for default operators', async function () {
      const defaultOps = await damToken.defaultOperators();
      expect(defaultOps).to.be.an('array').that.is.empty;
    });
  });
});
