import { expect } from 'chai';
import { RevertMessages } from '../helpers/common';
import { deployLockTokenAndMintFixture } from '../helpers/fixtures/lockToken';
import { loadFixture } from '../helpers/fixtureRunner';

describe('LockToken Burn', function () {
	describe('burnToAddress', function () {
		it('Should revert if a user tries to burn more tokens than they have', async function () {
			const { lockquidityToken, owner, ethers } = await loadFixture(deployLockTokenAndMintFixture);
			// This test is critical for enforcing token supply integrity and preventing malicious burning.
			// It ensures that users cannot burn more LOCK tokens than they currently possess, which is a fundamental
			// security measure to prevent negative balances, unauthorized token destruction, and manipulation of the token supply.
			const burnAmount = (await lockquidityToken.balanceOf(owner.address)) + ethers.parseUnits('1', 18);

			await expect(lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount)).to.be.revertedWith(
				RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE
			);
		});
	});
});
