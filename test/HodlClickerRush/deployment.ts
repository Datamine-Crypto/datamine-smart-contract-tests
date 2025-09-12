import { expect } from "chai";
import { hodlClickerRushFixture } from "../helpers";

describe("HodlClickerRush Deployment", () => {
  let hodlClickerRush: any;

  beforeEach(async () => {
    const fixture = await hodlClickerRushFixture();
    hodlClickerRush = fixture.hodlClickerRush;
  });

  it("Should initialize with totalTips equal to 0", async () => {
    expect(await hodlClickerRush.totalTips()).to.equal(0);
  });
});
