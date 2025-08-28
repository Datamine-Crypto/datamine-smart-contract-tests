import { expect } from 'chai';
import { EMPTY_BYTES, EventNames, ZERO_ADDRESS } from './common';

/**
 * A generic helper to test the operatorBurn functionality of the DAM token.
 * It authorizes an operator, burns tokens, and asserts all resulting state changes and events.
 * @param damToken The DAM token contract instance.
 * @param owner The owner of the tokens.
 * @param operator The operator account that will perform the burn.
 * @param burnAmount The amount of tokens to burn.
 */
export async function testTokenBurn(damToken: any, owner: any, operator: any, burnAmount: any) {
  // Authorize operator
  await damToken.connect(owner).authorizeOperator(operator.address);

  const ownerBalanceBefore = await damToken.balanceOf(owner.address);
  const totalSupplyBefore = await damToken.totalSupply();

  // Operator burns tokens
  const burnTx = await damToken.connect(operator).operatorBurn(owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);

  const expectedBalanceAfter = ownerBalanceBefore - burnAmount;
  const expectedSupplyAfter = totalSupplyBefore - burnAmount;

  // Assertions
  expect(await damToken.balanceOf(owner.address)).to.equal(expectedBalanceAfter);
  expect(await damToken.totalSupply()).to.equal(expectedSupplyAfter);
  await expect(burnTx)
    .to.emit(damToken, EventNames.Burned)
    .withArgs(operator.address, owner.address, burnAmount, EMPTY_BYTES, EMPTY_BYTES);
  await expect(burnTx).to.emit(damToken, EventNames.Transfer).withArgs(owner.address, ZERO_ADDRESS, burnAmount);
}
