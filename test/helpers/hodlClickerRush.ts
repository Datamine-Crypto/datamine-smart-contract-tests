import { ethers } from 'hardhat';
import { hodlClickerRushFixture } from './fixtures';
import { lockTokens, mineBlocks, setupPlayerForHodlClicker } from './';

export async function setupHodlClickerRushTests() {
  const fixture = await hodlClickerRushFixture();
  const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2 } = fixture;
  const signers = await ethers.getSigners();
  const addr3 = signers[3];
  const addr4 = signers[4];

  const depositFor = async (user: any, amount: any) => {
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
  };

  const setupBurnableAddress = async (user: any, amount: any) => {
    await damToken.connect(owner).transfer(user.address, amount);
    await lockTokens(fluxToken, damToken, user, amount, hodlClickerRush.target);
    await mineBlocks(1000);
  };

  return {
    hodlClickerRush,
    fluxToken,
    damToken,
    owner,
    addr1,
    addr2,
    addr3,
    addr4,
    depositFor,
    setupBurnableAddress,
  };
}
