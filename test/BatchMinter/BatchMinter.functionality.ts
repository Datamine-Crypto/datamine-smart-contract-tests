import { expect } from 'chai';

import { lockTokens, mineBlocks, parseUnits } from '../helpers/common';
import { deployBatchMinterFixture } from '../helpers/fixtures/batchMinter';
import { loadFixture } from '../helpers/fixtureRunner';

describe('BatchMinter Functionality', function () {
	it('should allow a user to batch burn when no delegated minter is set', async function () {
		const { damToken, fluxToken, batchMinter, owner, user1, ethers } = await loadFixture(deployBatchMinterFixture);

		// 1. Setup user1 with locked DAM
		const lockAmount = parseUnits('100');
		await damToken.connect(owner).transfer(user1.address, lockAmount);
		const lockBlock = await lockTokens(fluxToken, damToken, user1, lockAmount, batchMinter.target);

		// 2. Mine blocks to accrue mintable FLUX
		const blocksToMine = 10;
		await mineBlocks(blocksToMine);
		const endBlock = await ethers.provider.getBlockNumber();

		// 3. Prepare block numbers for batchBurn
		const blockNumbers = [];
		for (let i = lockBlock + 1; i <= endBlock; i++) {
			blockNumbers.push(i);
		}

		// 4. Get initial state
		const initialBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
		const initialBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

		// 5. Call batchBurn
		await batchMinter.connect(user1).batchBurn(user1.address, blockNumbers);

		// 6. Verify final state
		const finalBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
		const finalBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

		expect(finalBatchMinterBalance).to.equal(initialBatchMinterBalance);
		expect(finalBurnedAmount).to.be.gt(initialBurnedAmount);
	});

	it('should allow a delegated minter to batch burn', async function () {
		const { damToken, fluxToken, batchMinter, owner, user1, user2, ethers } =
			await loadFixture(deployBatchMinterFixture);

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

		// 4. Prepare block numbers for batchBurn
		const blockNumbers = [];
		for (let i = lockBlock + 1; i <= endBlock; i++) {
			blockNumbers.push(i);
		}

		// 5. Get initial state
		const initialBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
		const initialBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

		// 6. user2 calls batchBurn for user1
		await batchMinter.connect(user2).batchBurn(user1.address, blockNumbers);

		// 7. Verify final state
		const finalBurnedAmount = (await fluxToken.addressLocks(user1.address)).burnedAmount;
		const finalBatchMinterBalance = await fluxToken.balanceOf(batchMinter.target);

		expect(finalBatchMinterBalance).to.equal(initialBatchMinterBalance);
		expect(finalBurnedAmount).to.be.gt(initialBurnedAmount);
	});

	it('should send tokens to targetAddress with normalMintTo', async function () {
		const { damToken, fluxToken, batchMinter, owner, user1, user2, ethers } =
			await loadFixture(deployBatchMinterFixture);

		// 1. Setup user1 with locked DAM and set BatchMinter as the FluxToken minter
		const lockAmount = parseUnits('100');
		await damToken.connect(owner).transfer(user1.address, lockAmount);
		await lockTokens(fluxToken, damToken, user1, lockAmount, batchMinter.target);

		// 2. Mine blocks
		const blocksToMine = 10;
		await mineBlocks(blocksToMine);
		const endBlock = await ethers.provider.getBlockNumber();

		// 3. Get initial balance of target address (user2)
		const initialTargetBalance = await fluxToken.balanceOf(user2.address);

		// 4. Call normalMintTo
		await batchMinter.connect(user1).normalMintTo(user1.address, endBlock, user2.address);

		// 5. Verify final balance of target address
		const finalTargetBalance = await fluxToken.balanceOf(user2.address);
		expect(finalTargetBalance).to.be.gt(initialTargetBalance);
	});

	it('should revert if an unauthorized caller attempts to batchBurn', async function () {
		const { damToken, fluxToken, batchMinter, owner, user1, user2, ethers } =
			await loadFixture(deployBatchMinterFixture);

		const lockAmount = parseUnits('100');
		await damToken.connect(owner).transfer(user1.address, lockAmount);
		const lockBlock = await lockTokens(fluxToken, damToken, user1, lockAmount, batchMinter.target);

		await mineBlocks(10);
		const endBlock = await ethers.provider.getBlockNumber();

		const blockNumbers = [endBlock];

		// Attempting to batchBurn as user2 (who is not the delegated minter and not user1) should revert
		await expect(batchMinter.connect(user2).batchBurn(user1.address, blockNumbers)).to.be.revertedWith(
			'Caller is not the delegated minter'
		);
	});

	it('should revert if the lock owner attempts to batchBurn after delegating the minter', async function () {
		const { damToken, fluxToken, batchMinter, owner, user1, user2, ethers } =
			await loadFixture(deployBatchMinterFixture);

		const lockAmount = parseUnits('100');
		await damToken.connect(owner).transfer(user1.address, lockAmount);
		const lockBlock = await lockTokens(fluxToken, damToken, user1, lockAmount, batchMinter.target);

		// user1 delegates minter to user2
		await batchMinter.connect(user1).setDelegatedMinter(user2.address);

		await mineBlocks(10);
		const endBlock = await ethers.provider.getBlockNumber();

		const blockNumbers = [endBlock];

		// Even though user1 is the owner of the locked tokens, calling batchBurn from user1's address
		// should revert because user2 is now the effective delegated minter.
		await expect(batchMinter.connect(user1).batchBurn(user1.address, blockNumbers)).to.be.revertedWith(
			'Caller is not the delegated minter'
		);
	});

	it('should revert if an unauthorized caller attempts to normalMintTo', async function () {
		const { damToken, fluxToken, batchMinter, owner, user1, user2, ethers } =
			await loadFixture(deployBatchMinterFixture);

		const lockAmount = parseUnits('100');
		await damToken.connect(owner).transfer(user1.address, lockAmount);
		await lockTokens(fluxToken, damToken, user1, lockAmount, batchMinter.target);

		await mineBlocks(10);
		const endBlock = await ethers.provider.getBlockNumber();

		// Attempting to normalMintTo as user2 should revert
		await expect(batchMinter.connect(user2).normalMintTo(user1.address, endBlock, user2.address)).to.be.revertedWith(
			'Caller is not the delegated minter'
		);
	});
});
