import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  parseUnits,
  RevertMessages,
  deployDamToken,
  deployFluxToken,
  lockTokens,
  mineBlocks,
  mintFluxTokens,
} from '../helpers';

describe('FluxToken Mint', function () {
  async function deployFluxTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const damToken = await deployDamToken();
    // Deploy FluxToken with specific parameters for time bonus and failsafe.
    const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 0);

    return { fluxToken, damToken, owner, otherAccount };
  }

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

        // This test enforces a critical security measure: preventing `mintToAddress` from being called for a future `targetBlock`.
        // This safeguards against speculative minting based on unconfirmed future states, ensuring that token rewards are only
        // distributed for verifiable, past activity and maintaining the integrity of the time-based minting schedule.
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
});
