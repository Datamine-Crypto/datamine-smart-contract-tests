import { expect } from 'chai';
import { RevertMessages } from '../helpers/core/constants';
import { mineBlocks } from '../helpers/core/blockchain';
import { lockTokens } from '../helpers/core/tokens';
import { deployFluxTokenFixture, deployFluxTokenAndLockFixture } from '../helpers/fixtures/fluxToken';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';
import {
	testSuccessfulMint,
	testMintRevertFutureBlock,
	testMintRevertBeforeLastMint,
	testMintRevertNotMinter,
} from '../helpers/commonTests/mintTests';

describe('FluxToken Mint', function () {
	describe('mintToAddress', function () {
		describe('With locked tokens', function () {
			it('Should mint tokens to the target address', async function () {
				const { fluxToken, owner } = await loadFixture(deployFluxTokenAndLockFixture);
				await testSuccessfulMint(fluxToken, owner);
			});

			it('Should revert if targetBlock is in the future', async function () {
				const { fluxToken, owner, ethers } = await loadFixture(deployFluxTokenAndLockFixture);
				await testMintRevertFutureBlock(fluxToken, owner, ethers);
			});

			it('Should revert if targetBlock is before lastMintBlockNumber', async function () {
				const { fluxToken, owner } = await loadFixture(deployFluxTokenAndLockFixture);
				await testMintRevertBeforeLastMint(fluxToken, owner);
			});

			it('Should revert if caller is not the minterAddress', async function () {
				const { fluxToken, owner, otherAccount } = await loadFixture(deployFluxTokenAndLockFixture);
				await testMintRevertNotMinter(fluxToken, owner, otherAccount);
			});

			it('Should revert if owner tries to mint after delegating minter to another address', async function () {
				const { fluxToken, damToken, owner, otherAccount, lockAmount } =
					await loadFixture(deployFluxTokenAndLockFixture);

				// Owner currently has locks with minterAddress = owner.address.
				// Unlock first to allow setting a new minterAddress on next lock.
				await fluxToken.connect(owner).unlock();

				// Lock again, specifying otherAccount as the delegated minterAddress.
				await lockTokens(fluxToken, damToken, owner, lockAmount, otherAccount.address);

				// Advance 1 block to accrue some mintable tokens.
				const block = await mineBlocks(1);

				// The owner (owner.address) attempts to mint. This must revert because
				// they delegated the minter role to otherAccount.
				await expect(fluxToken.connect(owner).mintToAddress(owner.address, owner.address, block)).to.be.revertedWith(
					RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS
				);
			});
		});

		it('Should revert if sourceAddress has no locked tokens', async function () {
			const { fluxToken, owner, otherAccount, ethers } = await loadFixture(deployFluxTokenFixture);

			const block = await ethers.provider.getBlockNumber();

			// Ensure that minting can only occur for addresses that have actively participated by locking DAM tokens.
			// This prevents minting for inactive or non-contributing addresses.
			await expect(
				fluxToken.connect(owner).mintToAddress(otherAccount.address, owner.address, block)
			).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS);
		});
	});
});
