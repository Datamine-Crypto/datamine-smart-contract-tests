import { expect } from "chai";
import { ethers } from "hardhat";

import { hodlClickerRushFixture, lockTokens, mineBlocks } from "../helpers";

describe("HodlClickerRush Rewards", () => {
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

  it("should give a jackpot for the first burn in a block", async () => {
    const damAmount = ethers.parseEther("1000000");

    // owner will be the depositor, so it's its own minter
    await damToken.connect(owner).transfer(owner.address, damAmount);
    await lockTokens(fluxToken, damToken, owner, damAmount, owner.address);

    // addr1 will be the one being "burned", so hodlClicker is the minter
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);

    await mineBlocks(1000);
    const currentBlock = await ethers.provider.getBlockNumber();

    // owner mints its own tokens to be able to deposit them
    await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
    
    // owner deposits its FLUX
    const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
    expect(ownerFluxBalance).to.be.gt(0);
    await fluxToken.connect(owner).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(owner).deposit(ownerFluxBalance, 0, 0, 0);

    // addr2 calls burnTokens for addr1
    const burnTx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address);
    const receipt = await burnTx.wait();
    const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
    expect(event).to.not.be.undefined;
    const burnOperationResult = event.args;

    expect(burnOperationResult.jackpotAmount).to.be.gt(0);
  });

  it("should give a tip bonus even if nothing is minted", async () => {
    const [, , , addr3] = await ethers.getSigners();
    const damAmount = ethers.parseEther("1000000");

    // owner will be the depositor
    await damToken.connect(owner).transfer(owner.address, damAmount);
    await lockTokens(fluxToken, damToken, owner, damAmount, owner.address);
    await mineBlocks(1000);
    const currentBlock = await ethers.provider.getBlockNumber();
    await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
    const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
    await fluxToken.connect(owner).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(owner).deposit(ownerFluxBalance, 0, 0, 0);

    // addr1 is burned to generate tips
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);
    await mineBlocks(1);
    await hodlClickerRush.connect(addr2).burnTokens(addr1.address);

    // Turn off auto-mining (We want to perform two transaction in same block
    await ethers.provider.send("evm_setAutomine", [false]);

    // It is CRITICAL to leave this in as this is how we can get two transactions in the same block
    const gasLimit = 300000; // 200k was too low

    // addr2 will perform burn on addr1 (gets Jackpot)
    const burn1Tx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address, { gasLimit: gasLimit });
    
    // addr3 will perform burn on addr1 (gets Tip bonus)
    const burn2Tx = await hodlClickerRush.connect(addr3).burnTokens(addr1.address, { gasLimit: gasLimit });

    // Mine exactly 1 new block which will include both transactions
    await mineBlocks(1);

    // Re-enable auto mining
    await ethers.provider.send("evm_setAutomine", [true]);

    const [receipt1, receipt2] = await Promise.all([
        burn1Tx.wait(),
        burn2Tx.wait()
    ]);

    const tokensBurnedEvent = receipt1.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
    const tokensBurnedEventArgs = tokensBurnedEvent.args;

    const tipBonusAwarded = receipt2.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');
    const tipBonusAwardedArgs = tipBonusAwarded.args;

    expect(tokensBurnedEventArgs.amountActuallyBurned).to.be.gt(0);
    expect(tokensBurnedEventArgs.jackpotAmount).to.be.gt(0);

    expect(tipBonusAwardedArgs.currentBlock).to.equal(tokensBurnedEventArgs.currentBlock);
    expect(tipBonusAwardedArgs.tipBonus).to.be.gt(0); // We should be taking in some bonus
    expect(tipBonusAwardedArgs.totalTipsAfterTipBonus).to.be.gt(0); // There should be more bonus left after
  });
});