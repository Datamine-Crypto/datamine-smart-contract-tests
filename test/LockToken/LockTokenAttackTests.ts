import { expect } from 'chai';
import { parseUnits, mineBlocks, RevertMessages, lockTokens } from '../helpers/common';
import { testReentrancyOnBurn } from '../helpers/commonTests';
import { loadFixture } from '../helpers/fixtureRunner';
import { deployBaseFixture } from '../helpers/fixtures/base';
import { deployLockquidityToken } from '../helpers/deployHelpers';
import { getEthers } from '../helpers/getEthers';

async function deployLockTokenAttackFixture() {
	const { damToken, owner, addr1, addr2 } = await deployBaseFixture();

	// Deploy LockquidityToken with failsafe target block set to 0.
	const lockquidityToken = await deployLockquidityToken(damToken.target, 5760, 161280, 0, owner.address);

	// Deploy the malicious UnlockAttacker contract, which is designed to attempt re-entrancy.
	const ethers = await getEthers();
	const UnlockAttacker = await ethers.getContractFactory('UnlockAttacker');
	const unlockAttacker = await UnlockAttacker.deploy();

	// Transfer DAM to attackerAccount for locking.
	await damToken.connect(owner).transfer(addr1.address, parseUnits('1000'));

	return {
		lockquidityToken,
		damToken,
		unlockAttacker,
		owner,
		attackerAccount: addr1,
		otherAccount: addr2,
	};
}

describe('LockToken - Attack Scenarios', function () {
	describe('Re-entrancy on burnToAddress', function () {
		it('Should prevent re-entrancy on burnToAddress and not burn twice', async function () {
			const { lockquidityToken, damToken, unlockAttacker, owner, attackerAccount } =
				await loadFixture(deployLockTokenAttackFixture);
			const burnAmount = 100n;

			await testReentrancyOnBurn(lockquidityToken, damToken, unlockAttacker, owner, attackerAccount, burnAmount);
		});
	});

	describe('Direct validation checks', function () {
		it('Should revert if lock amount is 0', async function () {
			const { lockquidityToken, owner } = await loadFixture(deployLockTokenAttackFixture);
			await expect(lockquidityToken.connect(owner).lock(owner.address, 0)).to.be.revertedWith(
				RevertMessages.YOU_MUST_PROVIDE_A_POSITIVE_AMOUNT_TO_LOCK_IN
			);
		});

		it('Should revert if burn amount is 0', async function () {
			const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenAttackFixture);
			await lockTokens(lockquidityToken, damToken, owner, parseUnits('100'));
			await expect(lockquidityToken.connect(owner).burnToAddress(owner.address, 0)).to.be.revertedWith(
				'You must burn > 0 LOCK'
			);
		});

		it('Should revert if burning to an unlocked address', async function () {
			const { lockquidityToken, damToken, owner, otherAccount } = await loadFixture(deployLockTokenAttackFixture);
			await lockTokens(lockquidityToken, damToken, owner, parseUnits('100'));

			const mintBlock = await mineBlocks(100);
			await lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock);
			const ownerLockBalance = await lockquidityToken.balanceOf(owner.address);
			expect(ownerLockBalance).to.be.gt(0);

			await expect(
				lockquidityToken.connect(owner).burnToAddress(otherAccount.address, parseUnits('1'))
			).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS);
		});
	});
});
