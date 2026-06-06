import { RevertMessages, ContractNames } from '../helpers/core/constants';
import { testFailsafeLifecycle } from '../helpers/commonTests/lockTests';
import { deployLockTokenFixture } from '../helpers/fixtures/lockToken';
import { loadFixture } from '../helpers/fixtures/fixtureRunner';

describe('LockToken Failsafe', function () {
	describe('Failsafe', function () {
		it('Should prevent locking more than 100 tokens during failsafe period', async function () {
			const { damToken, owner, addrB, ethers } = await loadFixture(deployLockTokenFixture);

			await testFailsafeLifecycle(
				ethers,
				ContractNames.LockquidityToken,
				damToken,
				owner,
				addrB,
				RevertMessages.YOU_CAN_ONLY_LOCK_IN_UP_TO_100_ARBI_FLUX_DURING_FAILSAFE,
				[damToken.target, 5760, 161280, 20, owner.address]
			);
		});
	});
});
