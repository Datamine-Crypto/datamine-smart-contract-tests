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

/**
 * @dev Test suite for the FluxToken contract, covering its deployment, token locking,
 * minting mechanics, and resilience against specific attack scenarios.
 */
describe('FluxToken', function () {
  /**
   * @dev Fixture to deploy a fresh DamToken and FluxToken contract for each test.
   * This ensures a clean and isolated testing environment.
   */
  async function deployFluxTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    // Deploy FluxToken with specific parameters for time bonus and failsafe.
    const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

    return { fluxToken, damToken, owner, otherAccount };
  }

  describe('Deployment', function () {
    it('Should lock DAM tokens', async function () {
      const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
      const lockAmount = parseUnits('1');

      // Perform the lock operation to test the contract's ability to receive and hold DAM tokens.
      // This is fundamental for the FluxToken's operation as it mints based on locked DAM.
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Check if the tokens are correctly locked in the FluxToken contract's balance.
      const lockedBalance = await damToken.balanceOf(fluxToken.target);
      expect(lockedBalance).to.equal(lockAmount);
    });
  });

  describe('mintToAddress', function () {
    describe('With locked tokens', function () {
      let fluxToken: any, damToken: any, owner: any, otherAccount: any;
      const lockAmount = parseUnits('100');

      beforeEach(async function () {
        // Set up a fresh state for each test within this nested block, ensuring that
        // each minting test starts with a consistent environment where tokens are already locked.
        ({ fluxToken, damToken, owner, otherAccount } = await loadFixture(deployFluxTokenFixture));
      });

      it('Should mint tokens to the target address', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);
        const mintBlock = await mineBlocks(1);

        const expectedMintAmount = await fluxToken.getMintAmount(owner.address, mintBlock);
        // Verify that Flux tokens are correctly minted to the specified target address
        // based on the locked DAM tokens and the elapsed time (blocks).
        await fluxToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock);

        const ownerFluxBalance = await fluxToken.balanceOf(owner.address);
        expect(ownerFluxBalance).to.equal(expectedMintAmount);
      });

      it('Should revert if targetBlock is in the future', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);

        const futureBlock = (await ethers.provider.getBlockNumber()) + 100;

        // Prevent premature minting: ensure that minting can only occur for blocks that have already passed or are current.
        // This maintains the integrity of time-based minting calculations.
        await expect(
          fluxToken.connect(owner).mintToAddress(owner.address, owner.address, futureBlock),
        ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_UP_TO_CURRENT_BLOCK);
      });

      it('Should revert if targetBlock is before lastMintBlockNumber', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);
        await mintFluxTokens(fluxToken, owner, owner.address, 1);

        const lastMintBlock = await (await fluxToken.addressLocks(owner.address)).lastMintBlockNumber;

        // Prevent re-minting for already accounted-for periods.
        // This ensures that minting progress is monotonic and prevents double-counting rewards.
        await expect(
          fluxToken.connect(owner).mintToAddress(owner.address, owner.address, lastMintBlock),
        ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);
      });

      it('Should revert if caller is not the minterAddress', async function () {
        await lockTokens(fluxToken, damToken, owner, lockAmount);
        const block = await mineBlocks(1);

        // Enforce access control: ensure that only the delegated minter can initiate minting for a source address.
        // This protects against unauthorized minting.
        await expect(
          fluxToken.connect(otherAccount).mintToAddress(owner.address, otherAccount.address, block),
        ).to.be.revertedWith(RevertMessages.YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS);
      });
    });

    it('Should revert if sourceAddress has no locked tokens', async function () {
      const { fluxToken, owner, otherAccount } = await loadFixture(deployFluxTokenFixture);

      const block = await ethers.provider.getBlockNumber();

      // Ensure that minting can only occur for addresses that have actively participated by locking DAM tokens.
      // This prevents minting for inactive or non-contributing addresses.
      await expect(
        fluxToken.connect(owner).mintToAddress(otherAccount.address, owner.address, block),
      ).to.be.revertedWith(RevertMessages.YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS);
    });
  });

  describe('Attack Scenarios', function () {
    it('should not be possible to mint tokens for a past lock period after re-locking', async () => {
      const { fluxToken, damToken, owner } = await loadFixture(deployFluxTokenFixture);
      const lockAmount = parseUnits('100');

      // First lock to establish an initial state.
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Mint after some blocks to record a lastMintBlockNumber.
      const mintBlock1 = await mintFluxTokens(fluxToken, owner, owner.address, 10);

      // Unlock and then re-lock to simulate a user re-engaging with the system.
      await fluxToken.connect(owner).unlock();
      await mineBlocks(10);
      await lockTokens(fluxToken, damToken, owner, lockAmount);

      // Attempt to mint again using the *old* mint block number (mintBlock1).
      // This test is crucial to prevent double-minting or exploiting past lock periods
      // after a user has unlocked and re-locked tokens. It ensures the integrity of the
      // minting mechanism against time-based manipulation.
      await expect(fluxToken.connect(owner).mintToAddress(owner.address, owner.address, mintBlock1)).to.be.revertedWith(
        RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK,
      );
    });
  });
});
