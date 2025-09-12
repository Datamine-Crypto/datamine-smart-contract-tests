import { expect } from "chai";
import { ethers } from "hardhat";
import { setupHodlClickerRushTests } from "../helpers";

describe("HodlClickerRush Withdraw", () => {
  let hodlClickerRush: any, owner: any, addr1: any, addr2: any, depositFor: any, setupBurnableAddress: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
    owner = setup.owner;
    addr1 = setup.addr1;
    addr2 = setup.addr2;
    depositFor = setup.depositFor;
    setupBurnableAddress = setup.setupBurnableAddress;
  });

  it("should allow a user to withdraw earned rewards", async () => {
    const damAmount = ethers.parseEther("1000000");

    await depositFor(owner, damAmount);
    await setupBurnableAddress(addr1, damAmount);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);
    await depositFor(addr2, damAmount);
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);

    const initialRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    expect(initialRewardsAmount).to.be.gt(0);

    const initialTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();

    await hodlClickerRush.connect(addr2).withdrawAll();

    const finalRewardsAmount = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    const finalTotalContractRewardsAmount = await hodlClickerRush.totalContractRewardsAmount();

    expect(finalRewardsAmount).to.equal(0);
    expect(finalTotalContractRewardsAmount).to.equal(initialTotalContractRewardsAmount - initialRewardsAmount);
  });

  it("should not allow withdrawing more than earned rewards", async () => {
    const damAmount = ethers.parseEther("1000000");

    await depositFor(owner, damAmount);
    await setupBurnableAddress(addr1, damAmount);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);
    await depositFor(addr2, damAmount);
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);

    await hodlClickerRush.connect(addr2).withdrawAll();
    const addr2RewardsAfter = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    expect(addr2RewardsAfter).to.equal(0);
    await expect(hodlClickerRush.connect(addr2).withdrawAll()).to.be.revertedWith("No rewards to withdraw");
  });

  it("should not allow withdrawing zero amount", async () => {
    await expect(hodlClickerRush.connect(addr1).withdrawAll()).to.be.revertedWith("No rewards to withdraw");
  });
});
