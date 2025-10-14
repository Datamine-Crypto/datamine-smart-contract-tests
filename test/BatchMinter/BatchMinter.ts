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
});
