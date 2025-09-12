import { expect } from "chai";
import { ethers } from "hardhat";

import { hodlClickerRushFixture, lockTokens, mineBlocks, setupPlayerForHodlClicker } from "../helpers";

describe("HodlClickerRush Pause", () => {
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

  it("should allow an address to pause itself", async () => {
    await hodlClickerRush.connect(addr1).setPaused(true);
    const addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.isPaused).to.be.true;
  });

  it("should allow an address to unpause itself", async () => {
    await hodlClickerRush.connect(addr1).setPaused(true);
    let addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.isPaused).to.be.true;

    await hodlClickerRush.connect(addr1).setPaused(false);
    addr1Lock = await hodlClickerRush.addressLocks(addr1.address);
    expect(addr1Lock.isPaused).to.be.false;
  });

  it("should prevent a paused address from burning tokens", async () => {
    const damAmount = ethers.parseEther("1000000");

    // owner deposits a large amount of FLUX to ensure HodlClickerRush has enough balance
    const ownerFluxBalance = await setupPlayerForHodlClicker(hodlClickerRush, fluxToken, damToken, owner, damAmount, owner.address, owner);
    await hodlClickerRush.connect(owner).deposit(ownerFluxBalance, 0, 0, 0); // Deposit a large amount

    // Setup addr1 to be burned
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);
    await mineBlocks(1000);

    // Pause addr1
    await hodlClickerRush.connect(addr1).setPaused(true);

    // Attempt to burn tokens for addr1 (should revert)
    const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(addr1.address);
    expect(burnOperationResult.resultCode).to.equal(4); // ValidatorPaused
  });

  it("should allow an unpaused address to burn tokens", async () => {
    const damAmount = ethers.parseEther("1000000");

    // owner deposits a large amount of FLUX to ensure HodlClickerRush has enough balance
    const ownerFluxBalance = await setupPlayerForHodlClicker(hodlClickerRush, fluxToken, damToken, owner, damAmount, owner.address, owner);
    await hodlClickerRush.connect(owner).deposit(ownerFluxBalance, 0, 0, 0); // Deposit a large amount

    // Setup addr1 to be burned
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);
    await mineBlocks(1000);

    // Ensure addr1 is unpaused (default state, but explicitly set for test clarity)
    await hodlClickerRush.connect(addr1).setPaused(false);

    // Attempt to burn tokens for addr1 (should succeed)
    const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(addr1.address);
    expect(burnOperationResult.resultCode).to.equal(0); // Success
  });

  it("should emit PausedChanged event", async () => {
    await expect(hodlClickerRush.connect(addr1).setPaused(true))
      .to.emit(hodlClickerRush, "PausedChanged")
      .withArgs(addr1.address, true);

    await expect(hodlClickerRush.connect(addr1).setPaused(false))
      .to.emit(hodlClickerRush, "PausedChanged")
      .withArgs(addr1.address, false);
  });
});
