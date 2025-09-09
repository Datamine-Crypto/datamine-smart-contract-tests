import { expect } from "chai";
import { ethers } from "hardhat";

import { hodlClickerRushFixture, lockTokens, mineBlocks } from "../helpers";

describe("HodlClickerRush Burning", () => {
  let hodlClickerRush: any;
  let fluxToken: any;
  let damToken: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const burnAmount = ethers.parseEther("1");

  beforeEach(async () => {
    const fixture = await hodlClickerRushFixture();
    hodlClickerRush = fixture.hodlClickerRush;
    fluxToken = fixture.fluxToken;
    damToken = fixture.damToken;
    owner = fixture.owner;
    addr1 = fixture.addr1;
    addr2 = fixture.addr2;

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

  it("should give a 50% tip bonus to the first burner in a block", async () => {
    const totalTipsBefore = BigInt(await hodlClickerRush.totalTips());
    
    await hodlClickerRush.connect(addr1).burnTokens(burnAmount, addr1.address);

    const totalTipsAfter = BigInt(await hodlClickerRush.totalTips());
    const tipAmount = (BigInt(burnAmount) * BigInt(500)) / BigInt(10000);
    const remainingTip = tipAmount / BigInt(2); // 50% of the tip
    const tipBonus = ((totalTipsBefore + remainingTip) * BigInt(5)) / BigInt(100);

    // The totalTips should increase by the remaining 50% of the tip, minus the bonus paid out.
    expect(totalTipsAfter).to.equal(totalTipsBefore + remainingTip - tipBonus);
  });

  it("should give a jackpot to a new burner in a new block", async () => {
    // First burn by addr1
    await hodlClickerRush.connect(addr1).burnTokens(burnAmount, addr1.address);

    // Mine a new block
    await mineBlocks(1);

    // Second burn by addr2 in the new block
    const totalTipsBefore = BigInt(await hodlClickerRush.totalTips());
    await hodlClickerRush.connect(addr2).burnTokens(burnAmount, addr2.address);
    const totalTipsAfter = BigInt(await hodlClickerRush.totalTips());

    const tipAmount = (BigInt(burnAmount) * BigInt(500)) / BigInt(10000);
    const remainingTip = tipAmount / BigInt(2); // 50% of the tip for the new jackpot winner
    const tipBonus = ((totalTipsBefore + remainingTip) * BigInt(5)) / BigInt(100);

    // The totalTips should increase by the remaining 50% of the tip, minus the bonus paid out.
    expect(totalTipsAfter).to.equal(totalTipsBefore + remainingTip - tipBonus);
  });
});