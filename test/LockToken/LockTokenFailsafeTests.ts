import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { parseUnits, RevertMessages, deployDamToken, deployLockquidityContracts } from '../helpers';

describe('LockToken Failsafe', function () {
  async function deployLockTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
      damToken.target,
    );

    return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, otherAccount };
  }

  describe('Failsafe', function () {
    it('Should prevent locking more than 100 tokens during failsafe period', async function () {
      // This test is crucial for validating the failsafe mechanism of the LockquidityToken.
      // The failsafe limits the amount of tokens that can be locked during a specific period, acting as a protective measure
      // against large, sudden inflows that could destabilize the system or exploit vulnerabilities.
      // Ensuring this limit is enforced is vital for the overall security and stability of the token ecosystem.
      const { damToken, owner } = await loadFixture(deployLockTokenFixture);
      const LockquidityFactory = await ethers.getContractFactory('LockquidityFactory');
      const lockquidityFactory = await LockquidityFactory.deploy(damToken.target);
      const lockquidityToken = await ethers.getContractAt('LockquidityToken', await lockquidityFactory.token());

      const lockAmount = parseUnits('101');

      await damToken.connect(owner).authorizeOperator(lockquidityToken.target);
      await expect(lockquidityToken.connect(owner).lock(owner.address, lockAmount)).to.be.revertedWith(
        RevertMessages.YOU_CAN_ONLY_LOCK_IN_UP_TO_100_ARBI_FLUX_DURING_FAILSAFE,
      );
    });
  });
});
