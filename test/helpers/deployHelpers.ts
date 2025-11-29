import { ContractNames } from './common';
import { getEthers } from './getEthers';

/**
 * @dev This file centralizes helper functions for deploying various smart contracts
 * used within the test suite. The purpose of these helpers is to ensure consistent
 * and repeatable contract deployments across all tests, simplifying test setup
 * and improving readability by abstracting deployment logic.
 */

/**
 * Deploys the DamToken contract.
 * This is the foundational token of the Datamine Network, and its deployment
 * is a prerequisite for testing any contract that interacts with DAM.
 * @param signer Optional signer to use for deployment. If not provided, the default signer is used.
 * @returns The deployed DamToken contract instance.
 */
export async function deployDamToken(signer?: any) {
	const ethers = await getEthers();
	const DamToken = await ethers.getContractFactory(ContractNames.DamToken);
	const damToken = signer ? await DamToken.connect(signer).deploy() : await DamToken.deploy();
	return damToken;
}

/**
 * Deploys the LockquidityFactory and its associated contracts (LockquidityToken, LockquidityVault).
 * These contracts are essential for the Lockquidity ecosystem, managing the locking of DAM
 * and the minting/burning of LOCK tokens. Deploying them together ensures a complete setup.
 * @param damTokenAddress The address of the DAM token contract.
 * @returns An object containing the deployed factory, token, and vault instances.
 */
export async function deployLockquidityContracts(damTokenAddress: string) {
	const ethers = await getEthers();
	const LockquidityFactory = await ethers.getContractFactory(ContractNames.LockquidityFactory);
	const lockquidityFactory = await LockquidityFactory.deploy(damTokenAddress);
	const lockquidityToken = await ethers.getContractAt(ContractNames.LockquidityToken, await lockquidityFactory.token());
	const lockquidityVault = await ethers.getContractAt(ContractNames.LockquidityVault, await lockquidityFactory.vault());
	return { lockquidityFactory, lockquidityToken, lockquidityVault };
}

/**
 * Deploys the FluxToken contract.
 * FluxToken is a key component for managing token supply and incentivizing participation
 * through its unique minting and burning mechanics. Its deployment is necessary for
 * testing its core functionalities and interactions with DAM.
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
	failsafeBlock: number
) {
	const ethers = await getEthers();
	const FluxToken = await ethers.getContractFactory(ContractNames.FluxToken);
	const fluxToken = await FluxToken.deploy(damTokenAddress, timeBonusStartBlock, timeBonusEndBlock, failsafeBlock);
	return fluxToken;
}

/**
 * Deploys the DamBlockingHolder contract.
 * This contract is specifically designed to test re-entrancy scenarios and ERC777 hook
 * interactions in a controlled environment, making its deployment crucial for security tests.
 * @param lockquidityTokenAddress The address of the lockable token contract (e.g., LockquidityToken).
 * @returns The deployed DamBlockingHolder contract instance.
 */
export async function deployDamBlockingHolder(lockquidityTokenAddress: string) {
	const ethers = await getEthers();
	const DamBlockingHolder = await ethers.getContractFactory(ContractNames.DamBlockingHolder);
	const damBlockingHolder = await DamBlockingHolder.deploy(lockquidityTokenAddress);
	return damBlockingHolder;
}

/**
 * Deploys the DamHolder contract.
 * This contract acts as a general holder for DAM tokens and is used to test
 * various token management functionalities, including ERC777 hooks and operator patterns.
 * @returns The deployed DamHolder contract instance.
 */
export async function deployDamHolder() {
	const ethers = await getEthers();
	const DamHolder = await ethers.getContractFactory(ContractNames.DamHolder);
	const damHolder = await DamHolder.deploy();
	return damHolder;
}

/**
 * Deploys the LockquidityToken contract directly, without using the factory.
 * This direct deployment is used in specific test scenarios where fine-grained control
 * over the LockquidityToken's constructor parameters (e.g., failsafe settings) is required,
 * bypassing the factory's default deployment logic.
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
	ownerAddress: string
) {
	const ethers = await getEthers();
	const LockquidityToken = await ethers.getContractFactory(ContractNames.LockquidityToken);
	const lockquidityToken = await LockquidityToken.deploy(
		damTokenAddress,
		timeBonusStartBlock,
		timeBonusEndBlock,
		failsafeBlock,
		ownerAddress
	);
	return lockquidityToken;
}
