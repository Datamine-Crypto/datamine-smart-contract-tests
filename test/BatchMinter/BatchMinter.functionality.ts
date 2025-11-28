import { expect } from 'chai';

import { deployBatchMinterFixture, lockTokens, mineBlocks, parseUnits, loadFixture } from '../helpers/index';

describe('BatchMinter Functionality', function () {
	it('should allow a user to batch burn when no delegated minter is set', async function () {
		const { damToken, fluxToken, batchMinter, owner, user1, ethers } = await loadFixture(deployBatchMinterFixture);

		// 1. Setup user1 with locked DAM
		const lockAmount = parseUnits('100');
		await damToken.connect(owner).transfer(user1.address, lockAmount);
		const lockBlock = await lockTokens(ethers, fluxToken, damToken, user1, lockAmount, batchMinter.target);

		// 2. Mine blocks to accrue mintable FLUX
		const blocksToMine = 10;
		await mineBlocks(ethers, blocksToMine);
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
		const lockBlock = await lockTokens(ethers, fluxToken, damToken, user1, lockAmount, batchMinter.target);

		// 2. user1 sets user2 as the delegated minter in BatchMinter
		await batchMinter.connect(user1).setDelegatedMinter(user2.address);
		const delegatedMinter = await batchMinter.addressMintSettings(user1.address);
		expect(delegatedMinter).to.equal(user2.address);

		// 3. Mine blocks to accrue mintable FLUX
		const blocksToMine = 10;
		await mineBlocks(ethers, blocksToMine);
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
		await lockTokens(ethers, fluxToken, damToken, user1, lockAmount, batchMinter.target);

		// 2. Mine blocks
		const blocksToMine = 10;
		await mineBlocks(ethers, blocksToMine);
		const endBlock = await ethers.provider.getBlockNumber();

		// 3. Get initial balance of target address (user2)
		const initialTargetBalance = await fluxToken.balanceOf(user2.address);

		// 4. Call normalMintTo
		await batchMinter.connect(user1).normalMintTo(user1.address, endBlock, user2.address);

		// 5. Verify final balance of target address
		const finalTargetBalance = await fluxToken.balanceOf(user2.address);
		expect(finalTargetBalance).to.be.gt(initialTargetBalance);
	});
});
