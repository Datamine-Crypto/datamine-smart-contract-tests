import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat'; // Added explicit ethers import
import {
  parseUnits,
  ZERO_ADDRESS,
  ContractNames,
  EventNames,
  RevertMessages,
  EMPTY_BYTES,
  deployDamToken,
  testTokenBurn,
} from './helpers';

describe('DamToken', function () {
  async function deployDamTokenFixture() {
    const [owner, operatorAddress, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();

    return { damToken, owner, operatorAddress, otherAccount };
  }

  describe('Deployment', function () {
    it('Should have the correct name and symbol', async function () {
      const { damToken } = await loadFixture(deployDamTokenFixture);
      expect(await damToken.name()).to.equal('Datamine');
      expect(await damToken.symbol()).to.equal('DAM');
    });

    it('Should assign the total supply of tokens to the owner', async function () {
      const { damToken, owner } = await loadFixture(deployDamTokenFixture);
      const ownerBalance = await damToken.balanceOf(owner.address);
      expect(await damToken.totalSupply()).to.equal(ownerBalance);
    });

    it('Should have the correct initial supply', async function () {
      const { damToken } = await loadFixture(deployDamTokenFixture);
      const expectedSupply = parseUnits('25000000');
      expect(await damToken.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe('Burning', function () {
    it('should ensure supply burns properly via operator', async function () {
      const { damToken, owner, operatorAddress } = await loadFixture(deployDamTokenFixture);
      const burnAmount = parseUnits('1000');
      await testTokenBurn(damToken, owner, operatorAddress, burnAmount);
    });
  });

  describe('Token Operations', function () {
    let damToken: any;
    let owner: any;
    let operatorAddress: any;
    let otherAccount: any;
    let initialSupply: any;

    beforeEach(async function () {
      ({ damToken, owner, operatorAddress, otherAccount } = await loadFixture(deployDamTokenFixture));
      initialSupply = await damToken.totalSupply();
    });

    // --- send function tests ---
    it('Should allow sending tokens to another address', async function () {
      const amountToSend = parseUnits('100');
      const ownerBalanceBefore = await damToken.balanceOf(owner.address);
      const otherAccountBalanceBefore = await damToken.balanceOf(otherAccount.address);

      await expect(damToken.connect(owner).send(otherAccount.address, amountToSend, EMPTY_BYTES))
        .to.emit(damToken, EventNames.Sent)
        .withArgs(owner.address, owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES);

      expect(await damToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore - amountToSend);
      expect(await damToken.balanceOf(otherAccount.address)).to.equal(otherAccountBalanceBefore + amountToSend);
    });

    it('Should revert when sending more tokens than balance', async function () {
      const amountToSend = initialSupply + parseUnits('1'); // More than owner's balance
      await expect(damToken.connect(owner).send(otherAccount.address, amountToSend, EMPTY_BYTES)).to.be.revertedWith(
        RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE,
      );
    });

    it('Should revert when sending tokens to the zero address', async function () {
      const amountToSend = parseUnits('100');
      await expect(damToken.connect(owner).send(ZERO_ADDRESS, amountToSend, EMPTY_BYTES)).to.be.revertedWith(
        RevertMessages.ERC777_SEND_TO_THE_ZERO_ADDRESS,
      );
    });

    // --- burn function tests ---
    it('Should allow burning tokens', async function () {
      const burnAmount = parseUnits('50', 18);
      const ownerBalanceBefore = await damToken.balanceOf(owner.address);
      const totalSupplyBefore = await damToken.totalSupply();

      await expect(damToken.connect(owner).burn(burnAmount, EMPTY_BYTES))
        .to.emit(damToken, EventNames.Burned)
        .withArgs(owner.address, owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);

      expect(await damToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore - burnAmount);
      expect(await damToken.totalSupply()).to.equal(totalSupplyBefore - burnAmount);
    });

    it('Should revert when burning more tokens than balance', async function () {
      const burnAmount = initialSupply + parseUnits('1'); // More than owner's balance
      await expect(damToken.connect(owner).burn(burnAmount, EMPTY_BYTES)).to.be.revertedWith(
        RevertMessages.ERC777_BURN_AMOUNT_EXCEEDS_BALANCE,
      );
    });

    // --- authorizeOperator and revokeOperator tests ---
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
      // owner is always an operator for themselves, so revoking self should revert
      await expect(damToken.connect(owner).revokeOperator(owner.address)).to.be.revertedWith(
        RevertMessages.ERC777_REVOKING_SELF_AS_OPERATOR,
      );
    });

    // --- operatorSend functionality ---
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
      // operatorAddress is not authorized
      await expect(
        damToken
          .connect(operatorAddress)
          .operatorSend(owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES),
      ).to.be.revertedWith(RevertMessages.ERC777_CALLER_IS_NOT_AN_OPERATOR_FOR_HOLDER);
    });

    // --- defaultOperators ---
    it('Should return an empty array for default operators', async function () {
      const defaultOps = await damToken.defaultOperators();
      expect(defaultOps).to.be.an('array').that.is.empty;
    });
  });
});
