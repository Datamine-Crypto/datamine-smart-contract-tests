import { expect } from 'chai';
import { hodlClickerRushFixture } from '../helpers/fixtures/hodlClickerRush';
import { depositFor, setupBurnableAddress } from '../helpers/hodlClickerRush';
import { loadFixture } from '../helpers/fixtureRunner';
import { mineBlocks } from '../helpers/common';
import { getEthers } from '../helpers/getEthers';

describe('HodlClickerRush Front-running', () => {
	it('should allow a player to front-run validator normalMintToAddress and claim the jackpot, causing validator to revert', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('0.1');

		// 1. Owner deposits a large amount to fund the rewards pool
		await depositFor(hodlClickerRush, fluxToken, damToken, owner, ethers.parseEther('1000'));

		// 2. Set up addr1 as a validator delegated to HodlClickerRush
		await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);

		// 3. Mine blocks to accumulate a substantial unminted balance
		await mineBlocks(1000);

		// Get current state
		const initialPlayerRewards = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
		expect(initialPlayerRewards).to.equal(0);

		// 4. Disable automining to simulate mempool transaction ordering in the same block
		const provider = (await getEthers()).provider;
		await provider.send('evm_setAutomine', [false]);

		try {
			// Player (addr2) front-runs by calling burnTokens with a higher gas price
			const playerTx = await hodlClickerRush.connect(addr2).burnTokens(0, addr1.address, {
				gasLimit: 500000,
				gasPrice: 30000000000n,
			});

			// Validator (addr1) tries to mint their own rewards directly with a lower gas price
			const validatorTx = await hodlClickerRush.connect(addr1).normalMintToAddress(addr1.address, {
				gasLimit: 500000,
				gasPrice: 10000000000n,
			});

			// Mine the block containing both transactions
			await mineBlocks(1);

			// Player transaction should succeed and claim the jackpot
			const playerReceipt = await playerTx.wait();
			expect(playerReceipt?.status).to.equal(1);
			expect(playerReceipt?.index).to.equal(0);

			// Validator transaction should fail (revert)
			let validatorReverted = false;
			try {
				await validatorTx.wait();
			} catch (e: any) {
				validatorReverted = true;
				expect(e.receipt).to.not.equal(undefined);
				expect(e.receipt.status).to.equal(0); // 0 status indicates revert/failure
				expect(e.receipt.index).to.equal(1);
			}
			expect(validatorReverted).to.equal(true);

			// Verify the block transaction order (Player transaction index 0, Validator transaction index 1)
			const block = await provider.getBlock(playerReceipt!.blockNumber);
			expect(block?.transactions[0]).to.equal(playerTx.hash);
			expect(block?.transactions[1]).to.equal(validatorTx.hash);

			// Verify that the player received the jackpot reward
			const finalPlayerRewards = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
			expect(finalPlayerRewards).to.be.gt(0);
		} finally {
			// Re-enable automining
			await provider.send('evm_setAutomine', [true]);
		}
	});

	it('should handle multi-player jackpot gas war where only the highest gas price player succeeds and other players return NothingToMint silently', async () => {
		const { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2, addr3, ethers } =
			await loadFixture(hodlClickerRushFixture);
		const damAmount = ethers.parseEther('0.1');

		// 1. Owner deposits a large amount to fund the rewards pool
		await depositFor(hodlClickerRush, fluxToken, damToken, owner, ethers.parseEther('1000'));

		// 2. Set up addr1 as a validator delegated to HodlClickerRush
		await setupBurnableAddress(damToken, fluxToken, owner, addr1, damAmount, hodlClickerRush);

		// 3. Mine blocks to accumulate a substantial unminted balance
		await mineBlocks(1000);

		// Get initial rewards for the two players
		const initialPlayerARewards = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
		const initialPlayerBRewards = (await hodlClickerRush.addressLocks(addr3.address)).rewardsAmount;
		expect(initialPlayerARewards).to.equal(0);
		expect(initialPlayerBRewards).to.equal(0);

		// 4. Disable automining to simulate mempool transaction ordering in the same block
		const provider = (await getEthers()).provider;
		await provider.send('evm_setAutomine', [false]);

		try {
			// Player A (addr2) submits a transaction with low gas price (10 Gwei)
			const txPlayerA = await hodlClickerRush.connect(addr2).burnTokens(0, addr1.address, {
				gasLimit: 500000,
				gasPrice: 10000000000n,
			});

			// Player B (addr3) submits a transaction with high gas price (30 Gwei)
			const txPlayerB = await hodlClickerRush.connect(addr3).burnTokens(0, addr1.address, {
				gasLimit: 500000,
				gasPrice: 30000000000n,
			});

			// Mine the block containing both transactions
			await mineBlocks(1);

			// Wait for both to complete
			const receiptPlayerA = await txPlayerA.wait();
			const receiptPlayerB = await txPlayerB.wait();

			// Both transactions should execute successfully (status 1)
			expect(receiptPlayerA?.status).to.equal(1);
			expect(receiptPlayerB?.status).to.equal(1);

			// Player B (high gas price) must be mined first (index 0)
			expect(receiptPlayerB?.index).to.equal(0);
			// Player A (low gas price) must be mined second (index 1)
			expect(receiptPlayerA?.index).to.equal(1);

			// Verify block ordering
			const block = await provider.getBlock(receiptPlayerB!.blockNumber);
			expect(block?.transactions[0]).to.equal(txPlayerB.hash);
			expect(block?.transactions[1]).to.equal(txPlayerA.hash);

			// Player B should get the jackpot rewards
			const finalPlayerBRewards = (await hodlClickerRush.addressLocks(addr3.address)).rewardsAmount;
			expect(finalPlayerBRewards).to.be.gt(0);

			// Player A should get 0 rewards because the second tx returns early with NothingToMint silently
			const finalPlayerARewards = (await hodlClickerRush.addressLocks(addr2.address)).rewardsAmount;
			expect(finalPlayerARewards).to.equal(0);

			// Verify that no TokensBurned event was emitted for Player A (since it returned early)
			const eventPlayerA = receiptPlayerA?.logs.find(
				(log: any) => log.fragment && log.fragment.name === 'TokensBurned'
			);
			expect(eventPlayerA).to.equal(undefined);

			// Verify that Player B's transaction did emit a TokensBurned event
			const eventPlayerB = receiptPlayerB?.logs.find(
				(log: any) => log.fragment && log.fragment.name === 'TokensBurned'
			);
			expect(eventPlayerB).to.not.equal(undefined);
		} finally {
			// Re-enable automining
			await provider.send('evm_setAutomine', [true]);
		}
	});
});
