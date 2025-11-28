import { expect } from 'chai';
import { deployLockTokenFixture, loadFixture, RevertMessages } from '../helpers/index.js';

describe('LockToken Failsafe', function () {
  describe('Failsafe', function () {
    it('Should prevent locking more than 100 tokens during failsafe period', async function () {
      // This test is crucial for validating the failsafe mechanism of the LockquidityToken.
      // The failsafe limits the amount of tokens that can be locked during a specific period, acting as a protective measure
      // against large, sudden inflows that could destabilize the system or exploit vulnerabilities.
      // Ensuring this limit is enforced is vital for the overall security and stability of the token ecosystem.
      const { lockquidityToken, damToken, owner, ethers } = await loadFixture(deployLockTokenFixture);

      const lockAmount = ethers.parseUnits('101', 18);

      await damToken.connect(owner).authorizeOperator(lockquidityToken.target);
      await expect(lockquidityToken.connect(owner).lock(owner.address, lockAmount)).to.be.revertedWith(
        RevertMessages.YOU_CAN_ONLY_LOCK_IN_UP_TO_100_ARBI_FLUX_DURING_FAILSAFE,
      );
    });
  });
});
