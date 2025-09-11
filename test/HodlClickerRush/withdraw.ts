import { expect } from "chai";
import { ethers } from "hardhat";

import { hodlClickerRushFixture, lockTokens, mineBlocks } from "../helpers";

describe("HodlClickerRush Withdraw", () => {
  let hodlClickerRush: any;
  let fluxToken: any;
  let damToken: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async () => {
    const fixture = await hodlClickerRushFixture();
    hodlClickerRush = fixture.hodlClickerRush;
    fluxToken = fixture.fluxToken;
    damToken = fixture.damToken;
    owner = fixture.owner;
    addr1 = fixture.addr1;
    addr2 = fixture.addr2;
  });

  it("should allow a user to withdraw earned rewards", async () => {
    const damAmount = ethers.parseEther("1000000");

    // owner deposits to provide totalContractRewardsAmount
    await damToken.connect(owner).transfer(owner.address, damAmount);
    await lockTokens(fluxToken, damToken, owner, damAmount, owner.address);
    await mineBlocks(1000);
    const currentBlock = await ethers.provider.getBlockNumber();
    await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
    const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
    await fluxToken.connect(owner).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(owner).deposit(ownerFluxBalance, 0, 0, 0);

    // addr1 is burned to generate tips
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);
    await mineBlocks(1);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);

    // addr2 deposits to have rewardsAmount and earn a tip bonus
    await damToken.connect(owner).transfer(addr2.address, damAmount);
    await lockTokens(fluxToken, damToken, addr2, damAmount, addr2.address);
    await mineBlocks(1);
    await fluxToken.connect(addr2).mintToAddress(addr2.address, addr2.address, await ethers.provider.getBlockNumber());
    const addr2FluxBalance = await fluxToken.balanceOf(addr2.address);
    await fluxToken.connect(addr2).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr2).deposit(addr2FluxBalance, 0, 0, 0);

    // addr2 burns for addr1 again to earn a tip bonus
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);

    const initialRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    expect(initialRewardsAmount).to.be.gt(0);

    const initialTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();

    // Withdraw a portion of the rewards
    // Withdraw all rewards
    await hodlClickerRush.connect(addr2).withdrawAll();

    const finalRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    const finalTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();

    expect(finalRewardsAmount).to.equal(0);
    expect(finalTotalContractRewardsAmount).to.equal(initialTotalContractRewardsAmount - initialRewardsAmount);
  });

  it("should not allow withdrawing more than earned rewards", async () => {
    const damAmount = ethers.parseEther("1000000");

    // owner deposits to provide totalContractRewardsAmount
    await damToken.connect(owner).transfer(owner.address, damAmount);
    await lockTokens(fluxToken, damToken, owner, damAmount, owner.address);
    await mineBlocks(1000);
    const currentBlock = await ethers.provider.getBlockNumber();
    await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
    const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
    await fluxToken.connect(owner).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(owner).deposit(ownerFluxBalance, 0, 0, 0);

    // addr1 is burned to generate tips
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);
    await mineBlocks(1);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);

    // addr2 deposits to have rewardsAmount and earn a tip bonus
    await damToken.connect(owner).transfer(addr2.address, damAmount);
    await lockTokens(fluxToken, damToken, addr2, damAmount, addr2.address);
    await mineBlocks(1);
    await fluxToken.connect(addr2).mintToAddress(addr2.address, addr2.address, await ethers.provider.getBlockNumber());
    const addr2FluxBalance = await fluxToken.balanceOf(addr2.address);
    await fluxToken.connect(addr2).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr2).deposit(addr2FluxBalance, 0, 0, 0);

    // addr2 burns for addr1 again to earn a tip bonus
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);

    const addr2RewardsBefore = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    await hodlClickerRush.connect(addr2).withdrawAll(); // Withdraw all available
    const addr2RewardsAfter = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    expect(addr2RewardsAfter).to.equal(0);
    await expect(hodlClickerRush.connect(addr2).withdrawAll()).to.be.revertedWith("No rewards to withdraw");
  });

  it("should not allow withdrawing zero amount", async () => {
    // With withdrawAll(), we can't test withdrawing a specific zero amount.
    // Instead, we test that calling withdrawAll when there are no rewards reverts.
    await expect(hodlClickerRush.connect(addr1).withdrawAll()).to.be.revertedWith("No rewards to withdraw");
  });
});
