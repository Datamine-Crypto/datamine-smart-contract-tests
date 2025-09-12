import { ethers } from 'hardhat';
import { hodlClickerRushFixture } from './fixtures';
import { lockTokens, mineBlocks, setupPlayerForHodlClicker } from './';

export async function depositFor(hodlClickerRush: any, fluxToken: any, damToken: any, user: any, amount: any) {
  const userFluxBalance = await setupPlayerForHodlClicker(
    hodlClickerRush,
    fluxToken,
    damToken,
    user,
    amount,
    user.address,
  );
  await hodlClickerRush.connect(user).deposit(userFluxBalance, 0, 0, 0);
  return userFluxBalance;
}

export async function setupBurnableAddress(
  damToken: any,
  fluxToken: any,
  owner: any,
  user: any,
  amount: any,
  hodlClickerRush: any,
) {
  await damToken.connect(owner).transfer(user.address, amount);
  await lockTokens(fluxToken, damToken, user, amount, hodlClickerRush.target);
  await mineBlocks(1000);
}

export async function setupDefaultScenario(
  hodlClickerRush: any,
  fluxToken: any,
  damToken: any,
  owner: any,
  user: any,
  amount: any,
) {
  await depositFor(hodlClickerRush, fluxToken, damToken, owner, amount);
  await setupBurnableAddress(damToken, fluxToken, owner, user, amount, hodlClickerRush);
}

export async function setupHodlClickerRushTests() {
  const fixture = await hodlClickerRushFixture();
  const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2 } = fixture;
  const signers = await ethers.getSigners();
  const addr3 = signers[3];
  const addr4 = signers[4];

  return {
    hodlClickerRush,
    fluxToken,
    damToken,
    owner,
    addr1,
    addr2,
    addr3,
    addr4,
  };
}
