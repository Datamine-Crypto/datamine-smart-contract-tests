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

  // This test is very important because it verifies that jackpot is given to the first person in the block
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

    // addr3 deposits to have rewardsAmount
    await damToken.connect(owner).transfer(addr3.address, damAmount);
    await lockTokens(fluxToken, damToken, addr3, damAmount, addr3.address);
    await mineBlocks(1);
    await fluxToken.connect(addr3).mintToAddress(addr3.address, addr3.address, await ethers.provider.getBlockNumber());
    const addr3FluxBalance = await fluxToken.balanceOf(addr3.address);
    await fluxToken.connect(addr3).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr3).deposit(addr3FluxBalance, 0, 0, 0);

    // Turn off auto-mining (We want to perform two transaction in same block
    await ethers.provider.send("evm_setAutomine", [false]);

    // It is CRITICAL to leave this in as this is how we can get two transactions in the same block
    const gasLimit = 300000; // 200k was too low

    // addr2 will perform burn on addr1 (gets Jackpot)
    const burn1Tx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address, { gasLimit: gasLimit });
    
    // addr2 will perform burn on addr1 again (should not get another Tip bonus)
    const burn2Tx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address, { gasLimit: gasLimit });

    // Mine exactly 1 new block which will include both transactions
    await mineBlocks(1);

    // Re-enable auto mining
    await ethers.provider.send("evm_setAutomine", [true]);

    const [receipt1, receipt2] = await Promise.all([
        burn1Tx.wait(),
        burn2Tx.wait()
    ]);

    const tokensBurnedEvent1 = receipt1.logs.find((log: any) => log.fragment && log.fragment.name === 'TokensBurned');
    const tokensBurnedEventArgs1 = tokensBurnedEvent1.args;

    const tipBonusAwarded1 = receipt1.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');
    const tipBonusAwarded2 = receipt2.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');

    expect(tokensBurnedEventArgs1.amountActuallyBurned).to.be.gt(0);
    expect(tokensBurnedEventArgs1.jackpotAmount).to.be.gt(0);

    expect(tipBonusAwarded1).to.not.be.undefined; // First burn should get a tip bonus
    expect(tipBonusAwarded2).to.be.undefined; // Second burn by same user in same block should NOT get a tip bonus
  });
  
  it("should give a tip bonus based on holdings in a new block", async () => {
    const damAmount = ethers.parseEther("1000000");

    // owner deposits to provide totalContractRewardsAmount
    await damToken.connect(owner).transfer(owner.address, damAmount);
    await lockTokens(fluxToken, damToken, owner, damAmount, owner.address);
    await mineBlocks(1000);
    const currentBlock = await ethers.provider.getBlockNumber();
    await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, currentBlock);
    const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
    await fluxToken.connect(owner).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(owner).deposit(ownerFluxBalance, 0, 0, 0);

    // addr2 deposits to have rewardsAmount
    await damToken.connect(owner).transfer(addr2.address, damAmount);
    await lockTokens(fluxToken, damToken, addr2, damAmount, addr2.address);
    await mineBlocks(1);
    await fluxToken.connect(addr2).mintToAddress(addr2.address, addr2.address, await ethers.provider.getBlockNumber());
    const addr2FluxBalance = await fluxToken.balanceOf(addr2.address);
    await fluxToken.connect(addr2).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr2).deposit(addr2FluxBalance, 0, 0, 0);

    // addr1 is burned to generate tips
    await damToken.connect(owner).transfer(addr1.address, damAmount);
    await lockTokens(fluxToken, damToken, addr1, damAmount, hodlClickerRush.target);
    await mineBlocks(1);
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);

    const totalTips = BigInt(await hodlClickerRush.totalTips());
    const totalContractRewardsAmount = BigInt(await hodlClickerRush.totalContractRewardsAmount());
    const addr2RewardsAmount = BigInt((await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount);

    const expectedTipBonus = (totalTips * addr2RewardsAmount) / totalContractRewardsAmount;

    // Now addr2 burns for addr1 again, there should be nothing to mint, but a tip should be given
    const burnTx = await hodlClickerRush.connect(addr2).burnTokens(addr1.address);
    const receipt = await burnTx.wait();
    const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');
    const tipBonusAwarded = event.args;

    expect(tipBonusAwarded.tipBonus).to.equal(expectedTipBonus);
  });

  it("should only give one tip bonus per block even if burning for multiple addresses (different burnToAddress)", async () => {
    const [, , , addr3, addr4] = await ethers.getSigners(); // Add addr4
    const damAmount = ethers.parseEther("1000000");

    // owner deposits to provide totalContractRewardsAmount
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
    await hodlClickerRush.connect(owner).burnTokens(addr1.address);

    // addr4 is also set up to be burned
    await damToken.connect(owner).transfer(addr4.address, damAmount);
    await lockTokens(fluxToken, damToken, addr4, damAmount, hodlClickerRush.target);
    await mineBlocks(1);
    await hodlClickerRush.connect(owner).burnTokens(addr4.address);

    // addr2 deposits to have rewardsAmount and earn a tip bonus
    await damToken.connect(owner).transfer(addr2.address, damAmount);
    await lockTokens(fluxToken, damToken, addr2, damAmount, addr2.address);
    await mineBlocks(1);
    await fluxToken.connect(addr2).mintToAddress(addr2.address, addr2.address, await ethers.provider.getBlockNumber());
    const addr2FluxBalance = await fluxToken.balanceOf(addr2.address);
    await fluxToken.connect(addr2).authorizeOperator(hodlClickerRush.target);
    await hodlClickerRush.connect(addr2).deposit(addr2FluxBalance, 0, 0, 0);

    // Turn off auto-mining
    await ethers.provider.send("evm_setAutomine", [false]);

    const gasLimit = 300000;

    // addr2 burns for addr1
    const burnTx1 = await hodlClickerRush.connect(addr2).burnTokens(addr1.address, { gasLimit: gasLimit });
    // addr2 burns for addr4 (different burnToAddress)
    const burnTx2 = await hodlClickerRush.connect(addr2).burnTokens(addr4.address, { gasLimit: gasLimit });

    // Mine exactly 1 new block which will include both transactions
    await mineBlocks(1);

    // Re-enable auto mining
    await ethers.provider.send("evm_setAutomine", [true]);

    const [receipt1, receipt2] = await Promise.all([
      burnTx1.wait(),
      burnTx2.wait()
    ]);

    const tipBonusAwarded1 = receipt1.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');
    const tipBonusAwarded2 = receipt2.logs.find((log: any) => log.fragment && log.fragment.name === 'TipBonusAwarded');

    expect(tipBonusAwarded1).to.not.be.undefined;
    expect(tipBonusAwarded2).to.be.undefined; // Only one tip bonus should be awarded for addr2 in this block
  });
});