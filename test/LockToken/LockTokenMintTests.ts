import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployLockquidityContracts,
  lockTokens,
  mineBlocks,
  mintLockTokens,
} from '../helpers';

describe('LockToken Mint', function () {
  async function deployLockTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
      damToken.target,
    );

    return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, otherAccount };
  }

  describe('mintToAddress', function () {
    describe('With locked tokens', function () {
      let lockquidityToken: any, damToken: any, owner: any, otherAccount: any;
      const lockAmount = parseUnits('100');

      beforeEach(async function () {
        ({ lockquidityToken, damToken, owner, otherAccount } = await loadFixture(deployLockTokenFixture));
        await lockTokens(lockquidityToken, damToken, owner, lockAmount);
      });

      it('Should revert if targetBlock is in the future', async function () {
        const futureBlock = (await mineBlocks(1)) + 100;

        await expect(
          lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, futureBlock),
        ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_UP_TO_CURRENT_BLOCK);
      });

      it('Should revert if targetBlock is before lastMintBlockNumber', async function () {
        const blockAfterLock = await mintLockTokens(lockquidityToken, owner, owner.address, 1);
        const currentBlock = await mineBlocks(1);

        await expect(
          lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, blockAfterLock),
        ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);
      });

      it('Should revert if caller is not the minterAddress', async function () {
        const block = await mineBlocks(1);

        await expect(
          lockquidityToken.connect(otherAccount).mintToAddress(owner.address, otherAccount.address, block),
        ).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
      });
    });

    it('Should revert if sourceAddress has no locked tokens', async function () {
      const { lockquidityToken, owner, otherAccount } = await loadFixture(deployLockTokenFixture);

      const block = await mineBlocks(0);

      await expect(
        lockquidityToken.connect(owner).mintToAddress(otherAccount.address, owner.address, block),
      ).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS);
    });
  });
});
