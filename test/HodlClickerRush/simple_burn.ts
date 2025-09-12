import { expect } from "chai";
import { ethers } from "hardhat";
import { setupHodlClickerRushTests } from "../helpers";

describe("HodlClickerRush Simple Burn", () => {
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

  it("should return InsufficientContractBalance if not enough FLUX is deposited", async () => {
    const damAmount = ethers.parseEther("1000000");
    await setupBurnableAddress(addr1, damAmount);

    const burnOperationResult = await hodlClickerRush.connect(addr2).burnTokens.staticCall(addr1.address);

    expect(burnOperationResult.resultCode).to.equal(3);
  });

  it("should successfully burn tokens if enough FLUX is deposited", async () => {
    const damAmount = ethers.parseEther("1000000");

    await depositFor(addr1, damAmount);
    await setupBurnableAddress(addr2, damAmount);

    const burnOperationResult = await hodlClickerRush.connect(owner).burnTokens.staticCall(addr2.address);

    expect(burnOperationResult.resultCode).to.equal(0);
  });
});
