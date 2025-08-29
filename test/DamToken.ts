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

/**
 * @dev Test suite for the DamToken contract, covering its deployment, core ERC777 functionalities,
 * and operator management. These tests ensure the token behaves as expected under various scenarios,
 * including transfers, burning, and delegated operations.
 */
describe('DamToken', function () {
  /**
   * @dev Fixture to deploy a fresh DamToken contract and retrieve signer accounts for each test.
   * This ensures a clean and isolated testing environment.
   */
  async function deployDamTokenFixture() {
    const [owner, operatorAddress, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();

    return { damToken, owner, operatorAddress, otherAccount };
  }

  describe('Deployment', function () {
    it('Should have the correct name and symbol', async function () {
      const { damToken } = await loadFixture(deployDamTokenFixture);
      // Verify the token's identity to ensure it's correctly initialized as "Datamine" with symbol "DAM".
      expect(await damToken.name()).to.equal('Datamine');
      expect(await damToken.symbol()).to.equal('DAM');
    });

    it('Should assign the total supply of tokens to the owner', async function () {
      const { damToken, owner } = await loadFixture(deployDamTokenFixture);
      const ownerBalance = await damToken.balanceOf(owner.address);
      // Confirm that the entire initial supply is correctly allocated to the deployer (owner) as per design.
      expect(await damToken.totalSupply()).to.equal(ownerBalance);
    });

    it('Should have the correct initial supply', async function () {
      const { damToken } = await loadFixture(deployDamTokenFixture);
      const expectedSupply = parseUnits('25000000');
      // Verify that the total supply minted at deployment matches the expected fixed amount.
      expect(await damToken.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe('Burning', function () {
    it('should ensure supply burns properly via operator', async function () {
      const { damToken, owner, operatorAddress } = await loadFixture(deployDamTokenFixture);
      const burnAmount = parseUnits('1000');
      // Test delegated burning: ensure an authorized operator can successfully burn tokens on behalf of the owner.
      // This is a key ERC777 feature for flexible token management and delegated operations.
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
      // Set up a fresh state for each test within this block to ensure test isolation and predictability.
      ({ damToken, owner, operatorAddress, otherAccount } = await loadFixture(deployDamTokenFixture));
      initialSupply = await damToken.totalSupply();
    });

    // --- send function tests ---
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
      // Prevent overspending: ensure that a transfer fails if the sender does not have sufficient balance.
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

    // --- burn function tests ---
    it('Should allow burning tokens', async function () {
      const burnAmount = parseUnits('50', 18);
      const ownerBalanceBefore = await damToken.balanceOf(owner.address);
      const totalSupplyBefore = await damToken.totalSupply();

      // Verify that tokens can be permanently removed from circulation by burning them,
      // and that the correct ERC777 `Burned` event is emitted.
      await expect(damToken.connect(owner).burn(burnAmount, EMPTY_BYTES))
        .to.emit(damToken, EventNames.Burned)
        .withArgs(owner.address, owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);

      // Confirm that the owner's balance and total supply are updated correctly after burning.
      expect(await damToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore - burnAmount);
      expect(await damToken.totalSupply()).to.equal(totalSupplyBefore - burnAmount);
    });

    it('Should revert when burning more tokens than balance', async function () {
      const burnAmount = initialSupply + parseUnits('1'); // More than owner's balance
      // Prevent burning more tokens than available in the owner's balance.
      await expect(damToken.connect(owner).burn(burnAmount, EMPTY_BYTES)).to.be.revertedWith(
        RevertMessages.ERC777_BURN_AMOUNT_EXCEEDS_BALANCE,
      );
    });

    // --- authorizeOperator and revokeOperator tests ---
    it('Should allow authorizing an operator', async function () {
      // Verify that an owner can successfully delegate control over their tokens to an operator.
      // This enables third-party contracts or accounts to manage tokens on the owner's behalf.
      await expect(damToken.connect(owner).authorizeOperator(operatorAddress.address))
        .to.emit(damToken, EventNames.AuthorizedOperator)
        .withArgs(operatorAddress.address, owner.address);
      expect(await damToken.isOperatorFor(operatorAddress.address, owner.address)).to.be.true;
    });

    it('Should allow revoking an operator', async function () {
      await damToken.connect(owner).authorizeOperator(operatorAddress.address); // First authorize
      // Verify that an owner can successfully remove delegated control from an operator,
      // revoking their ability to manage tokens.
      await expect(damToken.connect(owner).revokeOperator(operatorAddress.address))
        .to.emit(damToken, EventNames.RevokedOperator)
        .withArgs(operatorAddress.address, owner.address);
      expect(await damToken.isOperatorFor(operatorAddress.address, owner.address)).to.be.false;
    });

    it('Should revert when authorizing self as operator', async function () {
      // Prevent a common ERC777 anti-pattern and potential re-entrancy risks.
      // An address should not be able to authorize itself as an operator.
      await expect(damToken.connect(owner).authorizeOperator(owner.address)).to.be.revertedWith(
        RevertMessages.ERC777_AUTHORIZING_SELF_AS_OPERATOR,
      );
    });

    it('Should revert when revoking self as operator', async function () {
      // owner is always an operator for themselves, so revoking self should revert.
      // This ensures basic functionality is maintained and prevents unexpected state.
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

      // Verify that an authorized operator can successfully send tokens on behalf of the owner,
      // demonstrating the utility of delegated control.
      await expect(
        damToken
          .connect(operatorAddress)
          .operatorSend(owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES),
      )
        .to.emit(damToken, EventNames.Sent)
        .withArgs(operatorAddress.address, owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES);

      // Confirm that balances are updated correctly after the operator-initiated transfer.
      expect(await damToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore - amountToSend);
      expect(await damToken.balanceOf(otherAccount.address)).to.equal(otherAccountBalanceBefore + amountToSend);
    });

    it('Should revert when an unauthorized operator tries to send tokens', async function () {
      const amountToSend = parseUnits('50');
      // operatorAddress is not authorized
      // Enforce access control: ensure that only authorized operators can perform delegated send operations.
      await expect(
        damToken
          .connect(operatorAddress)
          .operatorSend(owner.address, otherAccount.address, amountToSend, EMPTY_BYTES, EMPTY_BYTES),
      ).to.be.revertedWith(RevertMessages.ERC777_CALLER_IS_NOT_AN_OPERATOR_FOR_HOLDER);
    });

    // --- defaultOperators ---
    it('Should return an empty array for default operators', async function () {
      const defaultOps = await damToken.defaultOperators();
      // Verify that no default operators are pre-configured, ensuring a clean slate
      // and requiring explicit authorization for any delegated control.
      expect(defaultOps).to.be.an('array').that.is.empty;
    });
  });
});
