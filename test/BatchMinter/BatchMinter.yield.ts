import { deployBatchMinterFixture, lockTokens, mineBlocks, parseUnits, loadFixture } from '../helpers/index.js';

describe('BatchMinter Yield Comparison', function () {
  it('should calculate total burned amount for normal minting', async function () {
    const { damToken, fluxToken, owner, user1, user3, ethers } = await loadFixture(deployBatchMinterFixture);

    const lockAmount = parseUnits('100');

    const initialBurnBlocks = 1000;

    // Setup user3 to create a global burn history
    await damToken.connect(owner).transfer(user3.address, lockAmount);
    const lockBlock3 = await lockTokens(ethers, fluxToken, damToken, user3, lockAmount, user3.address);
    await mineBlocks(ethers, initialBurnBlocks);
    const endBlock3 = lockBlock3 + initialBurnBlocks;
    await fluxToken.connect(user3).mintToAddress(user3.address, user3.address, endBlock3);
    const user3FluxBalance = await fluxToken.balanceOf(user3.address);
    await fluxToken.connect(user3).burnToAddress(user3.address, user3FluxBalance);

    // Now, user1's scenario
    await damToken.connect(owner).transfer(user1.address, lockAmount);
    const initialBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
    const lockBlock1 = await lockTokens(ethers, fluxToken, damToken, user1, lockAmount, user1.address);

    const mintingPeriod = 300;
    await mineBlocks(ethers, mintingPeriod);
    const endBlock1 = lockBlock1 + mintingPeriod;

    await fluxToken.connect(user1).mintToAddress(user1.address, user1.address, endBlock1);
    const user1FluxBalance = await fluxToken.balanceOf(user1.address);
    await fluxToken.connect(user1).burnToAddress(user1.address, user1FluxBalance);

    const finalBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
    const totalBurned = finalBurnedAmount - initialBurnedAmount;
    console.log(`Total burned for normal mint (user1): ${ethers.formatUnits(totalBurned, 18)}`);
  });

  it('should calculate total burned amount for batch burning', async function () {
    const { damToken, fluxToken, batchMinter, owner, user2, user3, ethers } = await loadFixture(
      deployBatchMinterFixture,
    );

    const lockAmount = parseUnits('100');

    const initialBurnBlocks = 1000;

    // Setup user3 to create a global burn history
    await damToken.connect(owner).transfer(user3.address, lockAmount);
    const lockBlock3 = await lockTokens(ethers, fluxToken, damToken, user3, lockAmount, user3.address);
    await mineBlocks(ethers, initialBurnBlocks);
    const endBlock3 = lockBlock3 + initialBurnBlocks;
    await fluxToken.connect(user3).mintToAddress(user3.address, user3.address, endBlock3);
    const user3FluxBalance = await fluxToken.balanceOf(user3.address);
    await fluxToken.connect(user3).burnToAddress(user3.address, user3FluxBalance);

    // Now, user2's scenario
    await damToken.connect(owner).transfer(user2.address, lockAmount);
    const initialBurnedAmount = (await fluxToken.addressLocks(user2.address)).burnedAmount;
    const lockBlock2 = await lockTokens(ethers, fluxToken, damToken, user2, lockAmount, batchMinter.target);

    const mintingPeriod = 300;
    await mineBlocks(ethers, mintingPeriod);

    const blockNumbers = [];
    for (let i = 1; i <= 10; i++) {
      blockNumbers.push(lockBlock2 + i * 30);
    }
    await batchMinter.connect(user2).batchBurn(user2.address, blockNumbers);

    const finalBurnedAmount = (await fluxToken.addressLocks(user2.address)).burnedAmount;
    const totalBurned = finalBurnedAmount - initialBurnedAmount;
    console.log(`Total burned for batch burn (user2): ${ethers.formatUnits(totalBurned, 18)}`);
  });
});
