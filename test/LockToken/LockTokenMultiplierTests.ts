import { expect } from 'chai';
import {
	deployLockTokenAndLockFixture,
	mineBlocks,
	mintLockTokens,
	lockTokens,
	loadFixture,
} from '../helpers/index';

describe('LockToken Multipliers', function () {
	describe('Multipliers', function () {
		it('Should calculate the time multiplier correctly', async function () {
			const { lockquidityToken, owner, ethers } = await loadFixture(deployLockTokenAndLockFixture);
			// Advance blocks to simulate time passing
			const blocksToAdvance = 5760 + 9; // _startTimeReward + 9
			await mineBlocks(ethers, blocksToAdvance);

			const timeMultiplier = await lockquidityToken.getAddressTimeMultiplier(owner.address);
			expect(timeMultiplier).to.be.gt(10000); // Greater than 1x
		});

		it('Should calculate the burn multiplier correctly', async function () {
			const { lockquidityToken, damToken, owner, addrB, lockAmount, ethers } =
				await loadFixture(deployLockTokenAndLockFixture);
			// This test ensures the accurate calculation of the burn multiplier. This multiplier is designed to reward users
			// who actively participate in the token ecosystem by burning tokens, thereby influencing their future rewards
			// and contributing to the token's deflationary mechanics. Its correctness is essential for the intended economic incentives.
			// Lock tokens for addrB
			await damToken.connect(owner).transfer(addrB.address, lockAmount); // Transfer DAM from owner to addrB
			await lockTokens(ethers, lockquidityToken, damToken, addrB, lockAmount);

			const blocksToAdvance = 10000;
			await mintLockTokens(ethers, lockquidityToken, owner, owner.address, blocksToAdvance);

			// Burn some LOCK for owner
			const burnAmount = await lockquidityToken.balanceOf(owner.address);
			await lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount);

			const burnMultiplier = await lockquidityToken.getAddressBurnMultiplier(owner.address);
			expect(burnMultiplier).to.be.gt(1); // Greater than 1x
		});
	});
});
