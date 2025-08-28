import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat'; // Changed hre to ethers
import { time } from '@nomicfoundation/hardhat-network-helpers';
import {
  mineBlocks,
  parseUnits,
  ContractNames,
  EventNames,
  RevertMessages,
  EMPTY_BYTES,
  deployDamToken,
  deployFluxToken,
  lockTokens,
  mintFluxTokens,
} from './helpers';

describe('FLUX Token Migration Tests', function () {
  async function deployContractsFixture() {
    const [owner, damHolder, fluxMintReceiver, operator] = await ethers.getSigners();

    const damToken = await deployDamToken();
    const fluxToken = await deployFluxToken(damToken.target, 5760, 161280, 161280);

    // Transfer some DAM to the damHolder to have tokens to lock
    await damToken.connect(owner).transfer(damHolder.address, parseUnits('1000'));

    return { damToken, fluxToken, owner, damHolder, fluxMintReceiver, operator };
  }

  it('should ensure proper construction parameters with 0 premined coins', async () => {
    const { fluxToken } = await loadFixture(deployContractsFixture);
    expect(await fluxToken.name()).to.equal('FLUX');
    expect(await fluxToken.symbol()).to.equal('FLUX');
    expect(await fluxToken.totalSupply()).to.equal(0);
  });

  it('ensure DAM holder can lock DAM in FLUX smart contract', async () => {
    const { damToken, fluxToken, damHolder } = await loadFixture(deployContractsFixture);
    const lockInAmount = parseUnits('10');

    const blockAfterLock = await lockTokens(fluxToken, damToken, damHolder, lockInAmount);

    const lockInAmountForAddress = await fluxToken.addressLocks(damHolder.address);
    expect(lockInAmountForAddress.amount).to.equal(lockInAmount);
    expect(lockInAmountForAddress.blockNumber).to.equal(blockAfterLock);
  });

  it('ensure after locking-in DAM into FLUX you can unlock 100% of DAM back', async () => {
    const { damToken, fluxToken, damHolder } = await loadFixture(deployContractsFixture);
    const initialBalance = await damToken.balanceOf(damHolder.address);
    const lockInAmount = parseUnits('10');

    await lockTokens(fluxToken, damToken, damHolder, lockInAmount);

    expect(await damToken.balanceOf(damHolder.address)).to.equal(initialBalance - lockInAmount);
    expect(await damToken.balanceOf(fluxToken.target)).to.equal(lockInAmount);

    await expect(fluxToken.connect(damHolder).unlock())
      .to.emit(fluxToken, EventNames.Unlocked)
      .withArgs(damHolder.address, lockInAmount, 0);

    expect(await damToken.balanceOf(damHolder.address)).to.equal(initialBalance);
  });

  it('ensure failsafe works', async () => {
    const { damToken, owner, damHolder } = await loadFixture(deployContractsFixture);
    const FluxToken = await ethers.getContractFactory(ContractNames.FluxToken);
    const fluxTokenWithFailsafe = await FluxToken.deploy(damToken.target, 5760, 161280, 20);

    const lockInAmount = parseUnits('1000');
    const lockInAmountSafe = parseUnits('100');

    // Transfer DAM to holder to have funds to lock
    await damToken.connect(owner).transfer(damHolder.address, lockInAmount);

    // Attempting to lock more than the failsafe limit should fail.
    // The lockTokens helper also handles authorization.
    await expect(
      lockTokens(fluxTokenWithFailsafe, damToken, damHolder, lockInAmount),
    ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_LOCK_IN_UP_TO_100_DAM_DURING_FAILSAFE);

    // Locking an amount within the failsafe limit should succeed.
    await lockTokens(fluxTokenWithFailsafe, damToken, damHolder, lockInAmountSafe);
    await fluxTokenWithFailsafe.connect(damHolder).unlock();

    // After the failsafe period, locking the full amount should succeed.
    await mineBlocks(20);
    await expect(lockTokens(fluxTokenWithFailsafe, damToken, damHolder, lockInAmount)).to.not.be.reverted;
  });

    it('ensure FLUX can be minted after DAM lock-in to another address', async () => {
    const { damToken, fluxToken, damHolder, fluxMintReceiver } = await loadFixture(deployContractsFixture);
    const lockInAmount = parseUnits('1');

    await lockTokens(fluxToken, damToken, damHolder, lockInAmount, fluxMintReceiver.address);

    const currentBlock = await ethers.provider.getBlockNumber();

    // Ensure we can't mint on the same block
    await expect(
      fluxToken.connect(fluxMintReceiver).mintToAddress(damHolder.address, fluxMintReceiver.address, currentBlock),
    ).to.be.revertedWith(RevertMessages.YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK);

    // Calculate expected amount for the next block
    const nextBlock = await mineBlocks(1);
    const expectedMintAmount = await fluxToken.getMintAmount(damHolder.address, nextBlock);

    // Mint on that block
    await fluxToken.connect(fluxMintReceiver).mintToAddress(damHolder.address, fluxMintReceiver.address, nextBlock);

    expect(await fluxToken.balanceOf(fluxMintReceiver.address)).to.equal(expectedMintAmount);
  });

  it('ensure FLUX can be target-burned', async () => {
    const { damToken, fluxToken, damHolder, fluxMintReceiver } = await loadFixture(deployContractsFixture);
    const lockInAmount = parseUnits('10');

    await lockTokens(fluxToken, damToken, damHolder, lockInAmount);
    await mintFluxTokens(fluxToken, damHolder, damHolder.address, 1);

    // Transfer minted flux to the burner
    const mintedBalance = await fluxToken.balanceOf(damHolder.address);
    await fluxToken.connect(damHolder).transfer(fluxMintReceiver.address, mintedBalance);

    const burnAmount = parseUnits('0.000000001');

    const lockDataBefore = await fluxToken.addressLocks(damHolder.address);
    expect(lockDataBefore.burnedAmount).to.equal(0);

    await fluxToken.connect(fluxMintReceiver).burnToAddress(damHolder.address, burnAmount);
    const lockDataAfterFirstBurn = await fluxToken.addressLocks(damHolder.address);
    expect(lockDataAfterFirstBurn.burnedAmount).to.equal(burnAmount);

    await fluxToken.connect(fluxMintReceiver).burnToAddress(damHolder.address, burnAmount);
    const lockDataAfterSecondBurn = await fluxToken.addressLocks(damHolder.address);
    expect(lockDataAfterSecondBurn.burnedAmount).to.equal(burnAmount * 2n);
  });
});
