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

  it('should yield more tokens with BatchMinter compared to normal minting', async function () {
    const { damToken, fluxToken, batchMinter, owner, user1, user2 } = await loadFixture(
      deployBatchMinterFixture
    );

    // 1. Setup both users with the same locked amount
    const lockAmount = parseUnits('100');
    await damToken.connect(owner).transfer(user1.address, lockAmount);
    await damToken.connect(owner).transfer(user2.address, lockAmount);

    // user1 will do a normal mint
    const lockBlock1 = await lockTokens(fluxToken, damToken, user1, lockAmount, user1.address);

    // user2 will use the batch minter
    const lockBlock2 = await lockTokens(fluxToken, damToken, user2, lockAmount, batchMinter.target);

    // 2. Mine blocks
    const mintingPeriod = 100;
    await mineBlocks(mintingPeriod);
    const endBlock = await ethers.provider.getBlockNumber();

    // 3. Perform minting for both users
    // user1 (Normal Mint)
    await fluxToken.connect(user1).mintToAddress(user1.address, user1.address, endBlock);

    // user2 (Batch Mint)
    const blockNumbers = [];
    for (let i = lockBlock2 + 1; i <= endBlock; i++) {
      blockNumbers.push(i);
    }
    await batchMinter.connect(user2).batchMint(user2.address, blockNumbers);

    // 4. Verification: Compare burn multipliers
    const burnMultiplier1 = await fluxToken.getAddressBurnMultiplier(user1.address);
    const burnMultiplier2 = await fluxToken.getAddressBurnMultiplier(user2.address);

    expect(burnMultiplier2).to.be.gt(burnMultiplier1);
  });
});
