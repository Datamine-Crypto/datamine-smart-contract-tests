import { expect } from 'chai';
import { mineBlocks, RevertMessages } from '../helpers/common';
import { deployLockTokenAndLockFixture, deployLockTokenFixture } from '../helpers/fixtures/lockToken';
import { loadFixture } from '../helpers/fixtureRunner';
import {
	testMintRevertFutureBlock,
	testMintRevertBeforeLastMint,
	testMintRevertNotMinter,
} from '../helpers/commonTests';

describe('LockToken Mint', function () {
	describe('mintToAddress', function () {
		describe('With locked tokens', function () {
			it('Should revert if targetBlock is in the future', async function () {
				const { lockquidityToken, owner, ethers } = await loadFixture(deployLockTokenAndLockFixture);
				await testMintRevertFutureBlock(lockquidityToken, owner, ethers);
			});

			it('Should revert if targetBlock is before lastMintBlockNumber', async function () {
				const { lockquidityToken, owner } = await loadFixture(deployLockTokenAndLockFixture);
				await testMintRevertBeforeLastMint(lockquidityToken, owner);
			});

			it('Should revert if caller is not the minterAddress', async function () {
				const { lockquidityToken, owner, addrB } = await loadFixture(deployLockTokenAndLockFixture);
				await testMintRevertNotMinter(lockquidityToken, owner, addrB);
			});
		});

		it('Should revert if sourceAddress has no locked tokens', async function () {
			const { lockquidityToken, owner, addrB } = await loadFixture(deployLockTokenFixture);

			const block = await mineBlocks(0);

			await expect(
				lockquidityToken.connect(owner).mintToAddress(addrB.address, owner.address, block)
			).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS);
		});
	});
});
