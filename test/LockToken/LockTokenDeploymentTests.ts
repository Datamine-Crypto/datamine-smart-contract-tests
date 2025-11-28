import { expect } from 'chai';
import { deployLockTokenFixture, loadFixture, ZERO_ADDRESS, lockTokens, mineBlocks } from '../helpers/index.js';

describe('LockToken Deployment', function () {
	describe('Deployment', function () {
		it('Should deploy LockquidityFactory and its internal contracts', async function () {
			// This test verifies the successful deployment of the core LockquidityFactory and its associated contracts
			// (LockquidityToken and LockquidityVault). This is fundamental to ensure the entire ecosystem's foundational
			// components are correctly initialized and linked, as their proper deployment is a prerequisite for all
			// subsequent token operations.
			const { lockquidityFactory } = await loadFixture(deployLockTokenFixture);

			const lockquidityTokenAddress = await lockquidityFactory.token();
			const lockquidityVaultAddress = await lockquidityFactory.vault();

			expect(lockquidityTokenAddress).to.not.equal(ZERO_ADDRESS);
			expect(lockquidityVaultAddress).to.not.equal(ZERO_ADDRESS);
		});

		it('Should allow locking DAM tokens', async function () {
			const { lockquidityToken, damToken, owner, ethers } = await loadFixture(deployLockTokenFixture);

			const lockAmount = ethers.parseUnits('100', 18);

			await lockTokens(ethers, lockquidityToken, damToken, owner, lockAmount);

			// Verify that the LockquidityToken contract holds the locked DAM tokens
			expect(await damToken.balanceOf(lockquidityToken.target)).to.equal(lockAmount);
		});

		it('Should allow locking, minting, and burning LOCK tokens', async function () {
			const { lockquidityToken, lockquidityVault, damToken, owner, ethers } = await loadFixture(deployLockTokenFixture);

			const lockAmount = ethers.parseUnits('100', 18);

			await lockTokens(ethers, lockquidityToken, damToken, owner, lockAmount);

			// Mint LOCK after 1 block
			const blockAfterLock = await mineBlocks(ethers, 1);
			const expectedMintAmount = await lockquidityToken.getMintAmount(owner.address, blockAfterLock);
			await lockquidityToken.connect(owner).mintToAddress(owner.address, owner.address, blockAfterLock);

			// Verify owner's balance after minting
			const ownerLockBalanceAfterMint = await lockquidityToken.balanceOf(owner.address);
			expect(ownerLockBalanceAfterMint).to.equal(expectedMintAmount);

			// Burn LOCK
			const initialVaultLockBalance = await lockquidityToken.balanceOf(lockquidityVault.target);
			const burnAmount = ethers.parseUnits('0.0000000001', 18);

			// Ensure owner has enough tokens to burn
			expect(ownerLockBalanceAfterMint).to.be.gte(burnAmount);

			await lockquidityToken.connect(owner).burnToAddress(owner.address, burnAmount);

			// Ensure the vault increased by burned
			expect(await lockquidityToken.balanceOf(lockquidityVault.target)).to.equal(initialVaultLockBalance + burnAmount);
			// Ensure the address that did the burn has the LOCK reduced correctly
			expect(await lockquidityToken.balanceOf(owner.address)).to.equal(ownerLockBalanceAfterMint - burnAmount);
		});
	});
});
