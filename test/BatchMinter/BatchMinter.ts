import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployBatchMinterFixture,
  lockTokens,
  mineBlocks,
  parseUnits,
} from '../helpers';

describe('BatchMinter', function () {
  it('should allow a user to batch mint and burn when no delegated minter is set', async function () {
    const { damToken, fluxToken, batchMinter, owner, user1 } = await loadFixture(
      deployBatchMinterFixture
    );

    // 1. Setup user1 with locked DAM
    const lockAmount = parseUnits('100');
    await damToken.connect(owner).transfer(user1.address, lockAmount);
    const lockBlock = await lockTokens(fluxToken, damToken, user1, lockAmount, batchMinter.target);

    // 2. Mine blocks to accrue mintable FLUX
    const blocksToMine = 10;
    await mineBlocks(blocksToMine);
    const endBlock = await ethers.provider.getBlockNumber();

    // 3. Prepare block numbers for batchMint
    const blockNumbers = [];
    for (let i = lockBlock + 1; i <= endBlock; i++) {
      blockNumbers.push(i);
    }

    // 4. Get initial state
    const initialBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
    const initialBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

    // 5. Call batchMint
    await batchMinter.connect(user1).batchMint(user1.address, blockNumbers);

    // 6. Verify final state
    const finalBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
    const finalBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

    expect(finalBatchMinterBalance).to.equal(initialBatchMinterBalance);
    expect(finalBurnedAmount).to.be.gt(initialBurnedAmount);
  });

  it('should allow a delegated minter to batch mint and burn', async function () {
    const { damToken, fluxToken, batchMinter, owner, user1, user2 } = await loadFixture(
      deployBatchMinterFixture
    );

    // 1. Setup user1 with locked DAM and set BatchMinter as the FluxToken minter
    const lockAmount = parseUnits('100');
    await damToken.connect(owner).transfer(user1.address, lockAmount);
    const lockBlock = await lockTokens(fluxToken, damToken, user1, lockAmount, batchMinter.target);

    // 2. user1 sets user2 as the delegated minter in BatchMinter
    await batchMinter.connect(user1).setDelegatedMinter(user2.address);
    const delegatedMinter = await batchMinter.addressMintSettings(user1.address);
    expect(delegatedMinter).to.equal(user2.address);

    // 3. Mine blocks to accrue mintable FLUX
    const blocksToMine = 10;
    await mineBlocks(blocksToMine);
    const endBlock = await ethers.provider.getBlockNumber();

    // 4. Prepare block numbers for batchMint
    const blockNumbers = [];
    for (let i = lockBlock + 1; i <= endBlock; i++) {
      blockNumbers.push(i);
    }

    // 5. Get initial state
    const initialBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
    const initialBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

    // 6. user2 calls batchMint for user1
    await batchMinter.connect(user2).batchMint(user1.address, blockNumbers);

    // 7. Verify final state
    const finalBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
    const finalBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

    expect(finalBatchMinterBalance).to.equal(initialBatchMinterBalance);
    expect(finalBurnedAmount).to.be.gt(initialBurnedAmount);
  });

  describe('Yield Comparison', function () {
    it('should calculate total burned amount for normal minting', async function () {
      const { damToken, fluxToken, owner, user1, user3 } = await loadFixture(
        deployBatchMinterFixture
      );

      const lockAmount = parseUnits('100');

      // Setup user3 to create a global burn history
      await damToken.connect(owner).transfer(user3.address, lockAmount);
      const lockBlock3 = await lockTokens(fluxToken, damToken, user3, lockAmount, user3.address);
      await mineBlocks(100);
      const endBlock3 = lockBlock3 + 100;
      await fluxToken.connect(user3).mintToAddress(user3.address, user3.address, endBlock3);
      const user3FluxBalance = await fluxToken.balanceOf(user3.address);
      await fluxToken.connect(user3).burnToAddress(user3.address, user3FluxBalance);

      // Now, user1's scenario
      await damToken.connect(owner).transfer(user1.address, lockAmount);
      const initialBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
      const lockBlock1 = await lockTokens(fluxToken, damToken, user1, lockAmount, user1.address);

      const mintingPeriod = 100;
      await mineBlocks(mintingPeriod);
      const endBlock1 = lockBlock1 + mintingPeriod;

      await fluxToken.connect(user1).mintToAddress(user1.address, user1.address, endBlock1);
      const user1FluxBalance = await fluxToken.balanceOf(user1.address);
      await fluxToken.connect(user1).burnToAddress(user1.address, user1FluxBalance);

      const finalBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
      const totalBurned = finalBurnedAmount - initialBurnedAmount;
      console.log(`Total burned for normal mint (user1): ${ethers.formatUnits(totalBurned, 18)}`);
    });

    it('should calculate total burned amount for batch minting', async function () {
      const { damToken, fluxToken, batchMinter, owner, user2, user3 } = await loadFixture(
        deployBatchMinterFixture
      );

      const lockAmount = parseUnits('100');

      // Setup user3 to create a global burn history
      await damToken.connect(owner).transfer(user3.address, lockAmount);
      const lockBlock3 = await lockTokens(fluxToken, damToken, user3, lockAmount, user3.address);
      await mineBlocks(100);
      const endBlock3 = lockBlock3 + 100;
      await fluxToken.connect(user3).mintToAddress(user3.address, user3.address, endBlock3);
      const user3FluxBalance = await fluxToken.balanceOf(user3.address);
      await fluxToken.connect(user3).burnToAddress(user3.address, user3FluxBalance);

      // Now, user2's scenario
      await damToken.connect(owner).transfer(user2.address, lockAmount);
      const initialBurnedAmount = (await fluxToken.addressLocks(user2.address)).burnedAmount;
      const lockBlock2 = await lockTokens(fluxToken, damToken, user2, lockAmount, batchMinter.target);

      const mintingPeriod = 100;
      await mineBlocks(mintingPeriod);

      const blockNumbers = [];
      for (let i = 1; i <= 10; i++) {
        blockNumbers.push(lockBlock2 + i * 10);
      }
      await batchMinter.connect(user2).batchMint(user2.address, blockNumbers);

      const finalBurnedAmount = (await fluxToken.addressLocks(user2.address)).burnedAmount;
      const totalBurned = finalBurnedAmount - initialBurnedAmount;
      console.log(`Total burned for batch mint (user2): ${ethers.formatUnits(totalBurned, 18)}`);
    });
  });
});
