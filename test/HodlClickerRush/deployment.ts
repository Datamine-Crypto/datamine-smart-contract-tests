import { expect } from "chai";
import { setupHodlClickerRushTests } from "../helpers";

describe("HodlClickerRush Deployment", () => {
  let hodlClickerRush: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
  });

  it("Should initialize with totalTips equal to 0", async () => {
    expect(await hodlClickerRush.totalTips()).to.equal(0);
  });
});
