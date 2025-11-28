import { expect } from 'chai';
import {
	deployLockTokenAndLockFixture,
	deployLockTokenFixture,
	mineBlocks,
	mintLockTokens,
	RevertMessages,
	loadFixture,
} from '../helpers/index';

describe('LockToken Mint', function () {
	describe('mintToAddress', function () {
		describe('With locked tokens', function () {
			it('Should revert if targetBlock is in the future', async function () {
				const { lockquidityToken, owner, ethers } = await loadFixture(deployLockTokenAndLockFixture);
				const futureBlock = (await mineBlocks(ethers, 1)) + 100;

				await expect(
					lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, futureBlock)
				).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_UP_TO_CURRENT_BLOCK);
			});

			it('Should revert if targetBlock is before lastMintBlockNumber', async function () {
				const { lockquidityToken, owner, ethers } = await loadFixture(deployLockTokenAndLockFixture);
				// This test verifies that `mintToAddress` enforces a strictly increasing `targetBlock` number.
				// This prevents users from re-minting for past blocks, which could lead to double-counting rewards
				// or manipulating the minting history, thereby safeguarding the chronological integrity of token distribution.
				const blockAfterLock = await mintLockTokens(ethers, lockquidityToken, owner, owner.address, 1);
				const currentBlock = await mineBlocks(ethers, 1);

				await expect(
					lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, blockAfterLock)
				).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);
			});

			it('Should revert if caller is not the minterAddress', async function () {
				const { lockquidityToken, owner, addrB, ethers } = await loadFixture(deployLockTokenAndLockFixture);
				const block = await mineBlocks(ethers, 1);

				await expect(
					lockquidityToken.connect(addrB).mintToAddress(owner.address, addrB.address, block)
				).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
			});
		});

		it('Should revert if sourceAddress has no locked tokens', async function () {
			const { lockquidityToken, owner, addrB, ethers } = await loadFixture(deployLockTokenFixture);

			const block = await mineBlocks(ethers, 0);

			await expect(
				lockquidityToken.connect(owner).mintToAddress(addrB.address, owner.address, block)
			).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS);
		});
	});
});
