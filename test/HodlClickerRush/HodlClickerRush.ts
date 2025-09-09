import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";

import { hodlClickerRushFixture, lockTokens, mintFluxTokens } from "../helpers";

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

  it("Should initialize with totalTips equal to 0", async () => {
    expect(await hodlClickerRush.totalTips()).to.equal(0);
  });

  describe("burnTokens", () => {
    beforeEach(async () => {
      // Transfer some DAM to addr1 and addr2
      await damToken.connect(owner).transfer(addr1.address, ethers.parseEther("1000"));
      await damToken.connect(owner).transfer(addr2.address, ethers.parseEther("1000"));

      // Lock DAM tokens for addr1 and addr2, setting HodlClickerRush as the minter
      await lockTokens(fluxToken, damToken, addr1, ethers.parseEther("100"), hodlClickerRush.target);
      await lockTokens(fluxToken, damToken, addr2, ethers.parseEther("100"), hodlClickerRush.target);

      // Advance a block to allow minting
      await network.provider.send("evm_mine");

      // Mint FLUX tokens for addr1 and addr2 using the HodlClickerRush contract
      await hodlClickerRush.connect(addr1).normalMintToAddress(addr1.address);
      await hodlClickerRush.connect(addr2).normalMintToAddress(addr2.address);

      // Deposit rewards to the contract for addr1
      const addr1FluxBalance = await fluxToken.balanceOf(addr1.address);
      await fluxToken.connect(addr1).approve(hodlClickerRush.target, addr1FluxBalance);
      await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
      await hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 500, 0, 0);

      // Deposit rewards to the contract for addr2
      const addr2FluxBalance = await fluxToken.balanceOf(addr2.address);
      await fluxToken.connect(addr2).approve(hodlClickerRush.target, addr2FluxBalance);
      await fluxToken.connect(addr2).authorizeOperator(hodlClickerRush.target);
      await hodlClickerRush.connect(addr2).deposit(addr2FluxBalance, 500, 0, 0);
    });

    it("Should update totalTips correctly", async () => {
      const amountToBurn = ethers.parseEther("0.000000000000000020");
      await hodlClickerRush.connect(addr1).burnTokens(amountToBurn, addr2.address);
      const tipAmount = (BigInt(amountToBurn) * BigInt(500)) / BigInt(10000);
      expect(await hodlClickerRush.totalTips()).to.equal(tipAmount);
    });

    it("Should give 5% of totalTips to the burner", async () => {
      const amountToBurn = ethers.parseEther("0.000000000000000020");
      await hodlClickerRush.connect(addr1).burnTokens(amountToBurn, addr2.address);
      const initialTotalTips = (BigInt(amountToBurn) * BigInt(500)) / BigInt(10000);

      const addr2RewardsBefore = await hodlClickerRush.addressLocks(addr2.address);
      await hodlClickerRush.connect(addr2).burnTokens(amountToBurn, addr1.address);

      const tipBonus = (initialTotalTips * BigInt(5)) / BigInt(100);
      const addr2RewardsAfter = await hodlClickerRush.addressLocks(addr2.address);

      expect(addr2RewardsAfter.rewardsAmount).to.equal(BigInt(addr2RewardsBefore.rewardsAmount) + tipBonus);
    });
  });
});
