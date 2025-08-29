import { ethers } from 'hardhat';

/**
 * @dev This file centralizes common utility functions, constants, and enumerations
 * used across the Hardhat test suite. Its purpose is to promote code reusability,
 * maintain consistency in testing practices, and improve readability by abstracting
 * common operations and values.
 */

/**
 * Advances the blockchain by a specified number of blocks and returns the new block number.
 * This is crucial for testing time-dependent logic in smart contracts, such as
 * block-based rewards, failsafe periods, or time-locked functionalities.
 * @param blockCount The number of blocks to mine.
 * @returns The block number after mining.
 */
export async function mineBlocks(blockCount: number): Promise<number> {
  if (blockCount === 1) {
    await ethers.provider.send('evm_mine', []);
  } else {
    await ethers.provider.send('hardhat_mine', ['0x' + blockCount.toString(16)]);
  }
  return await ethers.provider.getBlockNumber();
}

/**
 * Parses a string amount into a BigInt, considering the specified number of decimals.
 * This helper ensures consistent and accurate handling of token amounts, especially
 * when dealing with varying decimal places in different tokens, preventing precision errors in tests.
 * @param amount The string representation of the amount.
 * @param decimals The number of decimals to use for parsing (default is 18).
 * @returns The parsed amount as a BigInt.
 */
export function parseUnits(amount: string, decimals: number = 18) {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Gets an instance of the ERC1820 registry contract.
 * This is necessary for interacting with ERC777 tokens, as the ERC1820 registry
 * is used to discover and register interfaces for ERC777 hooks (e.g., `tokensToSend`, `tokensReceived`).
 * @returns A contract instance attached to the ERC1820 registry address.
 */
export async function getERC1820Registry() {
  return await ethers.getContractAt(
    '@openzeppelin/contracts/introspection/IERC1820Registry.sol:IERC1820Registry',
    '0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24',
  );
}

// --- Constants ---

/**
 * A constant for the zero address in Ethereum (`0x0...0`).
 * Used to represent null addresses or for specific ERC777 transfer scenarios (e.g., burning).
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * A constant for empty bytes (`0x`), often used as default data in ERC777 transactions
 * when no specific user data or operator data is required.
 */
export const EMPTY_BYTES = '0x';

/**
 * The keccak256 hash of the string 'ERC777TokensSender'.
 * This hash is used to identify the `ERC777TokensSender` interface in the ERC1820 registry,
 * allowing contracts to declare their ability to send ERC777 tokens and trigger `tokensToSend` hooks.
 */
export const TOKENS_SENDER_INTERFACE_HASH = ethers.keccak256(ethers.toUtf8Bytes('ERC777TokensSender'));

/**
 * The keccak256 hash of the string 'ERC777TokensRecipient'.
 * This hash is used to identify the `ERC777TokensRecipient` interface in the ERC1820 registry,
 * allowing contracts to declare their ability to receive ERC777 tokens and trigger `tokensReceived` hooks.
 */
export const TOKENS_RECIPIENT_INTERFACE_HASH = ethers.keccak256(ethers.toUtf8Bytes('ERC777TokensRecipient'));

// --- Enums ---

/**
 * An enumeration of contract names used throughout the test suite for easy referencing.
 * This improves type safety and reduces the chance of errors from misspelled contract names.
 */
export enum ContractNames {
  DamToken = 'DamToken',
  FluxToken = 'FluxToken',
  LockquidityFactory = 'LockquidityFactory',
  LockquidityToken = 'LockquidityToken',
  LockquidityVault = 'LockquidityVault',
  DamBlockingHolder = 'DamBlockingHolder',
  DamHolder = 'DamHolder',
  LockToken = 'LockToken',
}

/**
 * An enumeration of event names emitted by the contracts, used for type-safe event testing.
 * This ensures that event assertions in tests are consistent and accurate, verifying contract behavior.
 */
export enum EventNames {
  Locked = 'Locked',
  Unlocked = 'Unlocked',
  TokensToSendHookExecuted = 'TokensToSendHookExecuted',
  Transfer = 'Transfer',
  Minted = 'Minted',
  Burned = 'Burned',
  Sent = 'Sent',
  AuthorizedOperator = 'AuthorizedOperator',
  RevokedOperator = 'RevokedOperator',
  TokensReceivedCalled = 'TokensReceivedCalled',
  TokensToSendCalled = 'TokensToSendCalled',
}

/**
 * An enumeration of common revert messages, ensuring consistency in testing for expected failures.
 * Using these constants makes tests more robust to minor changes in error message strings
 * and improves readability by clearly stating the expected reason for a revert.
 */
export enum RevertMessages {
  ERC777_TRANSFER_AMOUNT_EXCEEDS_BALANCE = 'ERC777: transfer amount exceeds balance',
  ERC777_SEND_TO_THE_ZERO_ADDRESS = 'ERC777: send to the zero address',
  ERC777_BURN_AMOUNT_EXCEEDS_BALANCE = 'ERC777: burn amount exceeds balance',
  ERC777_AUTHORIZING_SELF_AS_OPERATOR = 'ERC777: authorizing self as operator',
  ERC777_REVOKING_SELF_AS_OPERATOR = 'ERC777: revoking self as operator',
  ERC777_CALLER_IS_NOT_AN_OPERATOR_FOR_HOLDER = 'ERC777: caller is not an operator for holder',
  YOU_CAN_ONLY_LOCK_IN_UP_TO_100_ARBI_FLUX_DURING_FAILSAFE = 'You can only lock-in up to 100 ArbiFLUX during failsafe.',
  YOU_CAN_ONLY_MINT_UP_TO_CURRENT_BLOCK = 'You can only mint up to current block',
  YOU_CAN_ONLY_MINT_AHEAD_OF_LAST_MINT_BLOCK = 'You can only mint ahead of last mint block',
  YOU_MUST_HAVE_LOCKED_IN_YOUR_ARBI_FLUX_TOKENS = 'You must have locked-in your ArbiFLUX tokens',
  YOU_MUST_BE_THE_DELEGATED_MINTER_OF_THE_SOURCE_ADDRESS = 'You must be the delegated minter of the sourceAddress',
  YOU_MUST_HAVE_UNLOCKED_YOUR_DAM_TOKENS = 'You must have unlocked your DAM tokens',
  YOU_MUST_PROVIDE_A_POSITIVE_AMOUNT_TO_LOCK_IN = 'You must provide a positive amount to lock-in',
  YOU_CAN_ONLY_LOCK_IN_UP_TO_100_DAM_DURING_FAILSAFE = 'You can only lock-in up to 100 DAM during failsafe.',
  YOU_MUST_HAVE_LOCKED_IN_YOUR_DAM_TOKENS = 'You must have locked-in your DAM tokens',
  YOU_CAN_ONLY_LOCK_IN_DAM_TOKENS = 'You can only lock-in DAM tokens',
  ONLY_FLUX_CONTRACT_CAN_SEND_ITSELF_DAM_TOKENS = 'Only FLUX contract can send itself DAM tokens',
}

/**
 * An enumeration for different unit test cases, used for conditional logic in test contracts.
 * This allows a single test contract to exhibit different behaviors based on the test scenario,
 * which is particularly useful for simulating various re-entrancy or hook-related interactions.
 */
export enum UnitTestCases {
  CallUnlockTokensToSendHook = 0,
  CallSendTokensToSendHook = 1,
}
