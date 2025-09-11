import { expect } from "chai";
import { hodlClickerRushFixture } from "../helpers";
import { ethers } from "hardhat";

describe("HodlClickerRush Deployment", () => {
  let hodlClickerRush: any;

  beforeEach(async () => {
    const fixture = await hodlClickerRushFixture();
    hodlClickerRush = fixture.hodlClickerRush;
  });

  it("Should initialize with totalTips equal to 0", async () => {
    const [owner] = await ethers.getSigners();
    expect(await hodlClickerRush.totalTips()).to.equal(0);
  });
});