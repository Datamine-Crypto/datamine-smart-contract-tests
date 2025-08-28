import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat'; // Added explicit ethers import
import {
  mineBlocks,
  parseUnits,
  ZERO_ADDRESS,
  RevertMessages,
  deployDamToken,
  deployLockquidityContracts,
  lockTokens,
  mintLockTokens,
} from './helpers';

describe('LockToken', function () {
  async function deployLockTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const { lockquidityFactory, lockquidityToken, lockquidityVault } = await deployLockquidityContracts(
      damToken.target,
    );

    return { lockquidityFactory, lockquidityToken, lockquidityVault, damToken, owner, otherAccount };
  }

  describe('Deployment', function () {
    it('Should deploy LockquidityFactory and its internal contracts', async function () {
      const { lockquidityFactory } = await loadFixture(deployLockTokenFixture);

      const lockquidityTokenAddress = await lockquidityFactory.token();
      const lockquidityVaultAddress = await lockquidityFactory.vault();

      expect(lockquidityTokenAddress).to.not.equal(ZERO_ADDRESS);
      expect(lockquidityVaultAddress).to.not.equal(ZERO_ADDRESS);
    });

    it('Should allow locking DAM tokens', async function () {
      const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);

      const lockAmount = parseUnits('100');

      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Verify that the LockquidityToken contract holds the locked DAM tokens
      expect(await damToken.balanceOf(lockquidityToken.target)).to.equal(lockAmount);
    });

    it('Should allow locking, minting, and burning LOCK tokens', async function () {
      const { lockquidityToken, lockquidityVault, damToken, owner } = await loadFixture(deployLockTokenFixture);

      const lockAmount = parseUnits('100');

      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Mint LOCK after 1 block
      const blockAfterLock = await mineBlocks(1);
      const expectedMintAmount = await lockquidityToken.getMintAmount(owner.address, blockAfterLock);
      await lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, blockAfterLock);

      // Verify owner's balance after minting
      const ownerLockBalanceAfterMint = await lockquidityToken.balanceOf(owner.address);
      expect(ownerLockBalanceAfterMint).to.equal(expectedMintAmount);

      // Burn LOCK
      const initialVaultLockBalance = await lockquidityToken.balanceOf(lockquidityVault.target);
      const burnAmount = parseUnits('0.0000000001');

      // Ensure owner has enough tokens to burn
      expect(ownerLockBalanceAfterMint).to.be.gte(burnAmount);

      await lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount);

      // Ensure the vault increased by burned
      expect(await lockquidityToken.balanceOf(lockquidityVault.target)).to.equal(initialVaultLockBalance + burnAmount);
      // Ensure the address that did the burn has the LOCK reduced correctly
      expect(await lockquidityToken.balanceOf(owner.address)).to.equal(ownerLockBalanceAfterMint - burnAmount);
    });
  });

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

  describe('Unlock', function () {
    it('Should allow a user to unlock their tokens', async function () {
      const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
      const lockAmount = ethers.parseUnits('100', 18);

      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Unlock tokens
      await lockquidityToken.connect(owner).unlock();

      // Verify that the user's DAM token balance is restored
      expect(await damToken.balanceOf(owner.address)).to.equal(parseUnits('25000000')); // Initial balance
    });

    it('Should revert if a user tries to unlock without having locked tokens', async function () {
      const { lockquidityToken, owner } = await loadFixture(deployLockTokenFixture);

      await expect(lockquidityToken.connect(owner).unlock()).to.be.revertedWith(
        RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS,
      );
    });
  });

  describe('burnToAddress', function () {
    let lockquidityToken: any, damToken: any, owner: any;

    beforeEach(async function () {
      ({ lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture));
      const lockAmount = ethers.parseUnits('100', 18);
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);
      await mintLockTokens(lockquidityToken, owner, owner.address, 1);
    });

    it('Should revert if a user tries to burn more tokens than they have', async function () {
      const burnAmount = (await lockquidityToken.balanceOf(owner.address)) + parseUnits('1');

      await expect(lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount)).to.be.revertedWith(
        RevertMessages.ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE,
      );
    });
  });

  describe('Multipliers', function () {
    let lockquidityToken: any, damToken: any, owner: any, otherAccount: any;
    const lockAmount = ethers.parseUnits('100', 18);

    beforeEach(async function () {
      ({ lockquidityToken, damToken, owner, otherAccount } = await loadFixture(deployLockTokenFixture));
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);
    });

    it('Should calculate the time multiplier correctly', async function () {
      // Advance blocks to simulate time passing
      const blocksToAdvance = 5760 + 9; // _startTimeReward + 9
      await mineBlocks(blocksToAdvance);

      const timeMultiplier = await lockquidityToken.getAddressTimeMultiplier(owner.address);
      expect(timeMultiplier).to.be.gt(10000); // Greater than 1x
    });

    it('Should calculate the burn multiplier correctly', async function () {
      // Lock tokens for otherAccount
      await damToken.connect(owner).transfer(otherAccount.address, lockAmount); // Transfer DAM from owner to otherAccount
      await lockTokens(lockquidityToken, damToken, otherAccount, lockAmount);

      const blocksToAdvance = 10000;
      await mintLockTokens(lockquidityToken, owner, owner.address, blocksToAdvance);

      // Burn some LOCK for owner
      const burnAmount = await lockquidityToken.balanceOf(owner.address);
      await lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount);

      const burnMultiplier = await lockquidityToken.getAddressBurnMultiplier(owner.address);
      expect(burnMultiplier).to.be.gt(1); // Greater than 1x
    });
  });

  describe('Failsafe', function () {
    it('Should prevent locking more than 100 tokens during failsafe period', async function () {
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

  describe('Attack Scenarios', function () {
    it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
      const { lockquidityToken, damToken, owner } = await loadFixture(deployLockTokenFixture);
      const lockAmount = parseUnits('100');

      // First lock
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Mint after 10 blocks
      const mintBlock1 = await mintLockTokens(lockquidityToken, owner, owner.address, 10);

      // Unlock
      await lockquidityToken.connect(owner).unlock();
      await mineBlocks(10);

      // Re-lock
      await lockTokens(lockquidityToken, damToken, owner, lockAmount);

      // Try to mint again with the old mint block.
      // This should fail because the last mint block is now the re-lock block.
      await expect(
        lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1),
      ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);
    });
  });
});
