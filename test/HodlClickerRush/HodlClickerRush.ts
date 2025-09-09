import { expect } from "chai";
import { ethers, network } from "hardhat";

import { hodlClickerRushFixture, lockTokens, mineBlocks } from "../helpers";

describe("HodlClickerRush", () => {
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

  it("Should initialize with totalTips and lastJackpotBlock equal to 0", async () => {
    expect(await hodlClickerRush.totalTips()).to.equal(0);
    expect(await hodlClickerRush.lastJackpotBlock()).to.equal(0);
  });

  describe("burnTokens with Jackpot Logic", () => {
    const burnAmount = ethers.parseEther("1");

    beforeEach(async () => {
      // Transfer DAM and set up for locking
      await damToken.connect(owner).transfer(addr1.address, ethers.parseEther("10000"));
      await damToken.connect(owner).transfer(addr2.address, ethers.parseEther("10000"));

      // Lock a large amount of DAM to ensure sufficient FLUX minting
      await lockTokens(fluxToken, damToken, addr1, ethers.parseEther("10000"), hodlClickerRush.target);
      await lockTokens(fluxToken, damToken, addr2, ethers.parseEther("10000"), hodlClickerRush.target);

      // Mine a lot of blocks to generate enough FLUX
      await mineBlocks(20000);

      // Mint initial FLUX
      await hodlClickerRush.connect(addr1).normalMintToAddress(addr1.address);
      await hodlClickerRush.connect(addr2).normalMintToAddress(addr2.address);

      // Deposit FLUX so they have rewards to burn from
      const addr1FluxBalance = await fluxToken.balanceOf(addr1.address);
      await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
      await hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 500, 0, 0);

      const addr2FluxBalance = await fluxToken.balanceOf(addr2.address);
      await fluxToken.connect(addr2).authorizeOperator(hodlClickerRush.target);
      await hodlClickerRush.connect(addr2).deposit(addr2FluxBalance, 500, 0, 0);
    });

    it("should award jackpot to the first burner in a block", async () => {
      const rewardsBefore = (await hodlClickerRush.addressLocks(addr1.address)).rewardsAmount;
      const totalTipsBefore = await hodlClickerRush.totalTips();

      const tx = await hodlClickerRush.connect(addr1).burnTokens(burnAmount, addr2.address);
      const receipt = await tx.wait();
      const blockNumber = receipt.blockNumber;

      expect(await hodlClickerRush.lastJackpotBlock()).to.equal(blockNumber);

      const rewardsAfter = (await hodlClickerRush.addressLocks(addr1.address)).rewardsAmount;
      const totalTipsAfter = await hodlClickerRush.totalTips();

      const tipAmountValue = (BigInt(burnAmount) * BigInt(500)) / BigInt(10000);
      const jackpotAmount = tipAmountValue / BigInt(2);
      const remainingTip = tipAmountValue - jackpotAmount;
      
      const totalTipsForBonus = totalTipsBefore + remainingTip;
      const tipBonus = (totalTipsForBonus * BigInt(5)) / BigInt(100);

      const expectedReward = rewardsBefore + jackpotAmount + tipBonus;
      const expectedTotalTips = totalTipsBefore + remainingTip - tipBonus;

      expect(rewardsAfter).to.equal(expectedReward);
      expect(totalTipsAfter).to.equal(expectedTotalTips);
    });

    it("should not award jackpot to a subsequent burner in the same block", async () => {
        await network.provider.send("evm_setAutomine", [false]);
    
        const rewardsBefore1 = (await hodlClickerRush.addressLocks(addr1.address)).rewardsAmount;
        const rewardsBefore2 = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    
        const tx1 = await hodlClickerRush.connect(addr1).burnTokens(burnAmount, addr2.address);
        const tx2 = await hodlClickerRush.connect(addr2).burnTokens(burnAmount, addr1.address);
    
        await network.provider.send("evm_mine");
        await network.provider.send("evm_setAutomine", [true]);
    
        const receipt1 = await tx1.wait();
        const blockNumber = receipt1.blockNumber;
    
        expect(await hodlClickerRush.lastJackpotBlock()).to.equal(blockNumber);
    
        const rewardsAfter1 = (await hodlClickerRush.addressLocks(addr1.address)).rewardsAmount;
        const rewardsAfter2 = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
    
        const rewardDelta1 = rewardsAfter1 - rewardsBefore1;
        const rewardDelta2 = rewardsAfter2 - rewardsBefore2;

        expect(rewardDelta1).to.be.gt(rewardDelta2);
    });

    it("should award a new jackpot in a new block", async () => {
        await hodlClickerRush.connect(addr1).burnTokens(burnAmount, addr2.address);
        const lastBlock = await hodlClickerRush.lastJackpotBlock();
        const totalTipsBefore = await hodlClickerRush.totalTips();

        await mineBlocks(1);
    
        const rewardsBefore = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
        const tx = await hodlClickerRush.connect(addr2).burnTokens(burnAmount, addr1.address);
        const receipt = await tx.wait();
        const newBlockNumber = receipt.blockNumber;
    
        expect(newBlockNumber).to.be.gt(lastBlock);
        expect(await hodlClickerRush.lastJackpotBlock()).to.equal(newBlockNumber);
    
        const rewardsAfter = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
        const tipAmountValue = (BigInt(burnAmount) * BigInt(500)) / BigInt(10000);
        const jackpotAmount = tipAmountValue / BigInt(2);
        const remainingTip = tipAmountValue - jackpotAmount;
        const totalTipsForBonus = totalTipsBefore + remainingTip;
        const tipBonus = (totalTipsForBonus * BigInt(5)) / BigInt(100);

        const expectedReward = rewardsBefore + jackpotAmount + tipBonus;

        expect(rewardsAfter).to.equal(expectedReward);
      });
  });
});