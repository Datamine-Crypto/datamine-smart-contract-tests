import { expect } from 'chai';
import { parseUnits, mineBlocks, RevertMessages } from '../helpers/common';
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

			const ownerLockAmount = parseUnits('100');
			const attackerLockAmount = parseUnits('100');
			const burnAmount = 100n;

			// 1. Owner locks DAM to be the target of the burn.
			await damToken.connect(owner).authorizeOperator(lockquidityToken.target);
			await lockquidityToken.connect(owner).lock(owner.address, ownerLockAmount);

			// 2. Attacker locks DAM to mint some LOCK.
			await damToken.connect(attackerAccount).authorizeOperator(lockquidityToken.target);
			await lockquidityToken.connect(attackerAccount).lock(attackerAccount.address, attackerLockAmount);

			// 3. Mine blocks and mint LOCK for the attacker.
			const mintBlock = await mineBlocks(1000000);
			await lockquidityToken
				.connect(attackerAccount)
				.mintToAddress(attackerAccount.address, attackerAccount.address, mintBlock);
			const attackerLockBalance = await lockquidityToken.balanceOf(attackerAccount.address);
			expect(attackerLockBalance).to.be.gt(0);

			// 4. Attacker transfers LOCK to the attacker contract.
			await lockquidityToken.connect(attackerAccount).transfer(unlockAttacker.target, burnAmount);
			const attackerContractLockBalance = await lockquidityToken.balanceOf(unlockAttacker.target);
			expect(attackerContractLockBalance).to.equal(burnAmount);

			// 5. Set up the attack parameters within the `UnlockAttacker` contract.
			await unlockAttacker.setAttackParameters(lockquidityToken.target, owner.address, burnAmount);

			// 6. Get initial state of the owner's locked tokens and global burned amount.
			const initialOwnerLock = await lockquidityToken.addressLocks(owner.address);
			const initialGlobalBurnedAmount = await lockquidityToken.globalBurnedAmount();

			// 7. Execute the attack.
			await unlockAttacker.executeAttack();

			// 8. Check final state.
			const finalOwnerLock = await lockquidityToken.addressLocks(owner.address);
			const finalGlobalBurnedAmount = await lockquidityToken.globalBurnedAmount();

			// Verify that the re-entrancy protection successfully prevented double burning.
			expect(finalOwnerLock.burnedAmount).to.equal(initialOwnerLock.burnedAmount + burnAmount);
			expect(finalGlobalBurnedAmount).to.equal(initialGlobalBurnedAmount + burnAmount);
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
			await damToken.connect(owner).authorizeOperator(lockquidityToken.target);
			await lockquidityToken.connect(owner).lock(owner.address, parseUnits('100'));
			await expect(lockquidityToken.connect(owner).burnToAddress(owner.address, 0)).to.be.revertedWith(
				'You must burn > 0 LOCK'
			);
		});

		it('Should revert if burning to an unlocked address', async function () {
			const { lockquidityToken, damToken, owner, otherAccount } = await loadFixture(deployLockTokenAttackFixture);
			await damToken.connect(owner).authorizeOperator(lockquidityToken.target);
			await lockquidityToken.connect(owner).lock(owner.address, parseUnits('100'));

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
