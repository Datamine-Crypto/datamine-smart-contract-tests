import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { mineBlocks, parseUnits, deployDamToken, deployFluxToken } from './helpers';

describe('FluxToken - Attack Scenarios', function () {
  async function deployContractsFixture() {
    const [owner, attackerAccount, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

    const UnlockAttacker = await ethers.getContractFactory('UnlockAttacker');
    const unlockAttacker = await UnlockAttacker.deploy();

    // Transfer DAM to attackerAccount for locking, owner has the initial supply
    await damToken.connect(owner).transfer(attackerAccount.address, parseUnits('1000'));

    return { fluxToken, damToken, unlockAttacker, owner, attackerAccount, otherAccount };
  }

  describe('Re-entrancy on burnToAddress', function () {
    it('Should prevent re-entrancy on burnToAddress and not burn twice', async function () {
      const { fluxToken, damToken, unlockAttacker, owner, attackerAccount } = await loadFixture(deployContractsFixture);

      const ownerLockAmount = parseUnits('100');
      const attackerLockAmount = parseUnits('100');
      const burnAmount = parseUnits('0.1');

      // 1. Owner locks DAM to be the target of the burn
      await damToken.connect(owner).authorizeOperator(fluxToken.target);
      await fluxToken.connect(owner).lock(owner.address, ownerLockAmount);

      // 2. Attacker locks DAM to mint some FLUX
      await damToken.connect(attackerAccount).authorizeOperator(fluxToken.target);
      await fluxToken.connect(attackerAccount).lock(attackerAccount.address, attackerLockAmount);

      // 3. Mine blocks and mint FLUX for the attacker
      const mintBlock = await mineBlocks(1000000); // Mine a large number of blocks to mint enough FLUX
      await fluxToken
        .connect(attackerAccount)
        .mintToAddress(attackerAccount.address, attackerAccount.address, mintBlock);
      const attackerFluxBalance = await fluxToken.balanceOf(attackerAccount.address);
      expect(attackerFluxBalance).to.be.gt(0);

      // 4. Attacker transfers FLUX to the attacker contract
      await fluxToken.connect(attackerAccount).transfer(unlockAttacker.target, burnAmount);
      const attackerContractFluxBalance = await fluxToken.balanceOf(unlockAttacker.target);
      expect(attackerContractFluxBalance).to.equal(burnAmount);

      // 5. Set up the attack parameters
      await unlockAttacker.setAttackParameters(fluxToken.target, owner.address, burnAmount);

      // 6. Get initial state
      const initialOwnerLock = await fluxToken.addressLocks(owner.address);
      const initialGlobalBurnedAmount = await fluxToken.globalBurnedAmount();

      // 7. Execute the attack
      await unlockAttacker.executeAttack();

      // 8. Check final state
      const finalOwnerLock = await fluxToken.addressLocks(owner.address);
      const finalGlobalBurnedAmount = await fluxToken.globalBurnedAmount();

      // The burned amount for the owner should increase by exactly burnAmount, not more.
      expect(finalOwnerLock.burnedAmount).to.equal(initialOwnerLock.burnedAmount + burnAmount);
      expect(finalGlobalBurnedAmount).to.equal(initialGlobalBurnedAmount + burnAmount);
    });
  });
});
