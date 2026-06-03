import { expect } from 'chai';
import { hodlClickerRushFixture } from '../helpers/fixtures/hodlClickerRush';
import { setupPlayerForHodlClickerRush, depositFor, setupBurnableAddress } from '../helpers/hodlClickerRush';
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
			await provider.send('evm_mine', []);

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
				expect(e.receipt).to.not.be.undefined;
				expect(e.receipt.status).to.equal(0); // 0 status indicates revert/failure
				expect(e.receipt.index).to.equal(1);
			}
			expect(validatorReverted).to.be.true;

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
});
