import { expect } from "chai";
import { ethers } from "hardhat";

import { hodlClickerRushFixture, lockTokens, mineBlocks } from "../helpers";

describe("HodlClickerRush Simple Burn", () => {
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

  it("should return InsufficientContractBalance if not enough FLUX is deposited", async () => {
    // 1. Transfer a large amount of DAM to addr1
    const damAmount = ethers.parseEther("1000000");
    await damToken.connect(owner).transfer(addr1.address, damAmount);

    // 2. Lock-in DAM to mint FLUX, setting HodlClicker as the minter
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);

    // 3. Wait some blocks
    await mineBlocks(1000);

    // 4. In a brand new address (addr2), call the burnTokens()
    const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(addr1.address);

    // 5. This action should result in InsufficientContractBalance (code 3)
    expect(burnOperationResult.resultCode).to.equal(3);
  });

  it("should successfully burn tokens if enough FLUX is deposited", async () => {
    const damAmount = ethers.parseEther("1000000");

    // addr1 will be the depositor, so it's its own minter
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, addr1.address);

    // addr2 will be the one being "burned", so hodlClicker is the minter
    await damToken.connect(owner).transfer(addr2.address, damAmount);
    await lockTokens(fluxToken, damToken, addr2, damAmount, hodlClickerRush.target);

    await mineBlocks(1000);
    const currentBlock = await ethers.provider.getBlockNumber();

    // addr1 mints its own tokens to be able to deposit them
    await fluxToken.connect(addr1).mintToAddress(addr1.address, addr1.address, currentBlock);
    
    // addr1 deposits its FLUX
    const addr1FluxBalance = await fluxToken.balanceOf(addr1.address);
    expect(addr1FluxBalance).to.be.gt(0);
    await fluxToken.connect(addr1).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr1).deposit(addr1FluxBalance, 0, 0, 0);

    // owner calls burnTokens for addr2
    const burnOperationResult = await hodlClickerRush.connect(owner).burnTokens.staticCall(addr2.address);

    expect(burnOperationResult.resultCode).to.equal(0);
    expect(burnOperationResult.finalTotalTips).to.be.gt(0);
  });
});