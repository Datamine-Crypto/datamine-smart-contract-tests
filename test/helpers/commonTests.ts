import { expect } from 'chai';
import { EMPTY_BYTES, EventNames, ZERO_ADDRESS } from './common.js';

/**
 * @dev This file contains reusable test logic for common contract functionalities.
 * The purpose is to ensure consistency and reduce redundancy across multiple test files,
 * making the test suite more maintainable and readable.
 */

/**
 * A generic helper to test the `operatorBurn` functionality of the DAM token.
 * This helper is crucial because it encapsulates the full lifecycle of a delegated burn operation,
 * ensuring that all state changes and emitted events are correctly asserted.
 * It promotes consistent and thorough testing of a key ERC777 feature.
 * @param damToken The DAM token contract instance.
 * @param owner The owner of the tokens.
 * @param operator The operator account that will perform the burn.
 * @param burnAmount The amount of tokens to burn.
 */
export async function testTokenBurn(damToken: any, owner: any, operator: any, burnAmount: any) {
  // Authorize operator: This step is necessary to grant the `operator` account
  // the permission to burn tokens on behalf of the `owner`, as per ERC777 standards.
  await damToken.connect(owner).authorizeOperator(operator.address);

  const ownerBalanceBefore = await damToken.balanceOf(owner.address);
  const totalSupplyBefore = await damToken.totalSupply();

  // Operator burns tokens: Execute the `operatorBurn` function.
  // This is the core action being tested for its effects.
  const burnTx = await damToken.connect(operator).operatorBurn(owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);

  const expectedBalanceAfter = ownerBalanceBefore - burnAmount;
  const expectedSupplyAfter = totalSupplyBefore - burnAmount;

  // Assertions: Verify that the token balances and total supply are updated correctly.
  // This confirms the successful reduction of tokens from the owner's balance and overall supply.
  expect(await damToken.balanceOf(owner.address)).to.equal(expectedBalanceAfter);
  expect(await damToken.totalSupply()).to.equal(expectedSupplyAfter);

  // Assert that the `Burned` event is emitted with the correct arguments.
  // This verifies that the contract correctly signals the burn operation, which is important for off-chain indexing and auditing.
  await expect(burnTx)
    .to.emit(damToken, EventNames.Burned)
    .withArgs(operator.address, owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);

  // Assert that the `Transfer` event is emitted from the owner to the zero address.
  // This is the standard ERC20/ERC777 way to represent tokens being removed from circulation.
  await expect(burnTx).to.emit(damToken, EventNames.Transfer).withArgs(owner.address, ZERO_ADDRESS, burnAmount);
}
