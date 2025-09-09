import { expect } from "chai";
import { ethers } from "hardhat";
import { hodlClickerRushFixture, lockTokens, mineBlocks } from "../helpers";

describe("HodlClickerRush Staking", () => {
  let hodlClickerRush: any;
  let fluxToken: any;
  let damToken: any;
  let owner: any;
  let addr1: any;

  beforeEach(async () => {
    const fixture = await hodlClickerRushFixture();
    hodlClickerRush = fixture.hodlClickerRush;
    fluxToken = fixture.fluxToken;
    damToken = fixture.damToken;
    owner = fixture.owner;
    addr1 = fixture.addr1;

    // Basic setup for staking tests
    await damToken.connect(owner).transfer(addr1.address, ethers.parseEther("10000"));
    await lockTokens(fluxToken, damToken, addr1, ethers.parseEther("10000"), hodlClickerRush.target);
    await mineBlocks(100000);
    await hodlClickerRush.connect(addr1).normalMintToAddress(addr1.address);
  });

  it("should allow a user to deposit FLUX tokens", async () => {
    const depositAmount = ethers.parseEther("10");
    const addr1FluxBalance = await fluxToken.balanceOf(addr1.address);
    expect(addr1FluxBalance).to.be.gte(depositAmount);

    await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr1).deposit(depositAmount, 500, 0, 0);

    const addressLock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addressLock.rewardsAmount).to.equal(depositAmount);
  });

  it("should allow a user to withdraw their rewards", async () => {
    const depositAmount = ethers.parseEther("10");
    const addr1FluxBalanceBefore = await fluxToken.balanceOf(addr1.address);

    await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr1).deposit(depositAmount, 500, 0, 0);

    const addressLockBefore = await hodlClickerRush.addressLocks(addr1.address);
    expect(addressLockBefore.rewardsAmount).to.equal(depositAmount);

    await hodlClickerRush.connect(addr1).withdrawAll();

    const addressLockAfter = await hodlClickerRush.addressLocks(addr1.address);
    expect(addressLockAfter.rewardsAmount).to.equal(0);

    const addr1FluxBalanceAfter = await fluxToken.balanceOf(addr1.address);
    expect(addr1FluxBalanceAfter).to.equal(addr1FluxBalanceBefore);
  });
});
