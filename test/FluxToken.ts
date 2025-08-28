import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat'; // Added explicit ethers import
import {
  mineBlocks,
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployFluxToken,
  lockTokens,
  mintFluxTokens,
} from './helpers';

describe('FluxToken', function () {
  async function deployFluxTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

    return { fluxToken, damToken, owner, otherAccount };
  }

  describe('Deployment', function () {
    it('Should lock DAM tokens', async function () {
      const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
      const lockAmount = parseUnits('1');

      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Check if the tokens are locked in the contract
      const lockedBalance = await damToken.balanceOf(fluxToken.target);
      expect(lockedBalance).to.equal(lockAmount);
    });
  });

  describe('mintToAddress', function () {
    describe('With locked tokens', function () {
      let fluxToken: any, damToken: any, owner: any, otherAccount: any;
      const lockAmount = parseUnits('100');

      beforeEach(async function () {
        ({ fluxToken, damToken, owner, otherAccount } = await loadFixture(deployFluxTokenFixture));
      });

      it('Should mint tokens to the target address', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);
        const mintBlock = await mineBlocks(1);

        const expectedMintAmount = await fluxToken.getMintAmount(owner.address, mintBlock);
        await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock);

        const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
        expect(ownerFluxBalance).to.equal(expectedMintAmount);
      });

      it('Should revert if targetBlock is in the future', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);

        const futureBlock = (await ethers.provider.getBlockNumber()) + 100;

        await expect(
          fluxToken.connect(owner).mintToAddress(owner.address, owner.address, futureBlock),
        ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_UP_TO_CURRENT_BLOCK);
      });

      it('Should revert if targetBlock is before lastMintBlockNumber', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);
        await mintFluxTokens(fluxToken, owner, owner.address, 1);

        const lastMintBlock = await (await fluxToken.addressLocks(owner.address)).lastMintBlockNumber;

        await expect(
          fluxToken.connect(owner).mintToAddress(owner.address, owner.address, lastMintBlock),
        ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);
      });

      it('Should revert if caller is not the minterAddress', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);
        const block = await mineBlocks(1);

        await expect(
          fluxToken.connect(otherAccount).mintToAddress(owner.address, otherAccount.address, block),
        ).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
      });
    });

    it('Should revert if sourceAddress has no locked tokens', async function () {
      const { fluxToken, owner, otherAccount } = await loadFixture(deployFluxTokenFixture);

      const block = await ethers.provider.getBlockNumber();

      await expect(
        fluxToken.connect(owner).mintToAddress(otherAccount.address, owner.address, block),
      ).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS);
    });
  });

  describe('Attack Scenarios', function () {
    it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
      const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
      const lockAmount = parseUnits('100');

      // First lock
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Mint after 10 blocks
      const mintBlock1 = await mintFluxTokens(fluxToken, owner, owner.address, 10);

      // Unlock
      await fluxToken.connect(owner).unlock();
      await mineBlocks(10);

      // Re-lock
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Try to mint again with the old mint block.
      // This should fail because the last mint block is now the re-lock block.
      await expect(fluxToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1)).to.be.revertedWith(
        RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK,
      );
    });
  });
});
