import { ethers } from 'hardhat';
import { ContractNames } from './common';

/**
 * Deploys the DamToken contract.
 * @param signer Optional signer to use for deployment. If not provided, the default signer is used.
 * @returns The deployed DamToken contract instance.
 */
export async function deployDamToken(signer?: any) {
  const DamToken = await ethers.getContractFactory(ContractNames.DamToken);
  const damToken = signer ? await DamToken.connect(signer).deploy() : await DamToken.deploy();
  return damToken;
}

/**
 * Deploys the LockquidityFactory and its associated contracts (LockquidityToken, LockquidityVault).
 * @param damTokenAddress The address of the DAM token contract.
 * @returns An object containing the deployed factory, token, and vault instances.
 */
export async function deployLockquidityContracts(damTokenAddress: string) {
  const LockquidityFactory = await ethers.getContractFactory(ContractNames.LockquidityFactory);
  const lockquidityFactory = await LockquidityFactory.deploy(damTokenAddress);
  const lockquidityToken = await ethers.getContractAt(ContractNames.LockquidityToken, await lockquidityFactory.token());
  const lockquidityVault = await ethers.getContractAt(ContractNames.LockquidityVault, await lockquidityFactory.vault());
  return { lockquidityFactory, lockquidityToken, lockquidityVault };
}

/**
 * Deploys the FluxToken contract.
 * @param damTokenAddress The address of the DAM token contract.
 * @param timeBonusStartBlock The block number when the time bonus starts.
 * @param timeBonusEndBlock The block number when the time bonus reaches its maximum.
 * @param failsafeBlock The duration of the failsafe period in blocks.
 * @returns The deployed FluxToken contract instance.
 */
export async function deployFluxToken(
  damTokenAddress: string,
  timeBonusStartBlock: number,
  timeBonusEndBlock: number,
  failsafeBlock: number,
) {
  const FluxToken = await ethers.getContractFactory(ContractNames.FluxToken);
  const fluxToken = await FluxToken.deploy(damTokenAddress, timeBonusStartBlock, timeBonusEndBlock, failsafeBlock);
  return fluxToken;
}

/**
 * Deploys the DamBlockingHolder contract.
 * @param lockquidityTokenAddress The address of the lockable token contract (e.g., LockquidityToken).
 * @returns The deployed DamBlockingHolder contract instance.
 */
export async function deployDamBlockingHolder(lockquidityTokenAddress: string) {
  const DamBlockingHolder = await ethers.getContractFactory(ContractNames.DamBlockingHolder);
  const damBlockingHolder = await DamBlockingHolder.deploy(lockquidityTokenAddress);
  return damBlockingHolder;
}

/**
 * Deploys the DamHolder contract.
 * @returns The deployed DamHolder contract instance.
 */
export async function deployDamHolder() {
  const DamHolder = await ethers.getContractFactory(ContractNames.DamHolder);
  const damHolder = await DamHolder.deploy();
  return damHolder;
}

/**
 * Deploys the LockquidityToken contract directly, without using the factory.
 * @param damTokenAddress The address of the DAM token contract.
 * @param timeBonusStartBlock The block number when the time bonus starts.
 * @param timeBonusEndBlock The block number when the time bonus reaches its maximum.
 * @param failsafeBlock The duration of the failsafe period in blocks.
 * @param ownerAddress The address of the vault/owner.
 * @returns The deployed LockquidityToken contract instance.
 */
export async function deployLockquidityToken(
  damTokenAddress: string,
  timeBonusStartBlock: number,
  timeBonusEndBlock: number,
  failsafeBlock: number,
  ownerAddress: string,
) {
  const LockquidityToken = await ethers.getContractFactory(ContractNames.LockquidityToken);
  const lockquidityToken = await LockquidityToken.deploy(
    damTokenAddress,
    timeBonusStartBlock,
    timeBonusEndBlock,
    failsafeBlock,
    ownerAddress,
  );
  return lockquidityToken;
}
